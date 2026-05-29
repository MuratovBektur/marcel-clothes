import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import { BotUserWaGroup } from '../../entities/bot-user-wa-group.entity';

interface SocketEntry {
  sock: WASocket;
  ready: boolean;
}

// Безмолвный логгер — baileys требует pino-совместимый объект
const silentLogger = {
  trace: () => {},
  debug: () => {},
  info:  () => {},
  warn:  () => {},
  error: () => {},
  fatal: () => {},
  child: () => silentLogger,
  level: 'silent',
} as any;

@Injectable()
export class WaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WaService.name);
  private readonly sockets = new Map<number, SocketEntry>();

  constructor(
    @InjectRepository(BotUserWaGroup)
    private readonly repo: Repository<BotUserWaGroup>,
  ) {}

  async onModuleInit() {
    const baseDir = path.join(process.cwd(), 'uploads', 'wa-sessions');
    if (!fs.existsSync(baseDir)) return;

    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const sessionDirs = entries
      .filter((e) => e.isDirectory() && !isNaN(parseInt(e.name, 10)))
      .map((e) => ({ telegramId: parseInt(e.name, 10), sessDir: path.join(baseDir, e.name) }));

    if (!sessionDirs.length) return;

    const { version } = await fetchLatestBaileysVersion();
    await Promise.all(
      sessionDirs.map(({ telegramId, sessDir }) =>
        this.restoreExistingSession(telegramId, sessDir, version).catch((e) =>
          this.logger.warn(`Failed to restore WA session for telegramId=${telegramId}: ${e}`),
        ),
      ),
    );
  }

  private async restoreExistingSession(
    telegramId: number,
    sessDir: string,
    version: any,
  ): Promise<void> {
    const createSocket = async (): Promise<void> => {
      const { state, saveCreds } = await useMultiFileAuthState(sessDir);

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: silentLogger,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        mobile: false,
      });

      this.sockets.set(telegramId, { sock, ready: false });
      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
          const e = this.sockets.get(telegramId);
          if (e) e.ready = true;
          this.logger.log(`WA session restored for telegramId=${telegramId}`);
          return;
        }
        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          this.logger.warn(`WA session disconnected for telegramId=${telegramId}, code=${statusCode}`);

          if (statusCode === DisconnectReason.loggedOut || statusCode === (DisconnectReason as any).badSession) {
            // Session revoked — clean up
            this.sockets.delete(telegramId);
            if (fs.existsSync(sessDir)) {
              fs.rmSync(sessDir, { recursive: true, force: true });
            }
          } else if (statusCode === DisconnectReason.restartRequired) {
            await createSocket();
          } else {
            // Temporary network issue — reconnect after delay
            setTimeout(() => createSocket().catch(() => this.sockets.delete(telegramId)), 5000);
          }
        }
      });
    };

    await createSocket();
  }

  async onModuleDestroy() {
    for (const [, entry] of this.sockets) {
      try { entry.sock.end(undefined); } catch { /* ignore */ }
    }
    this.sockets.clear();
  }

  private sessionPath(telegramId: number): string {
    return path.join(process.cwd(), 'uploads', 'wa-sessions', String(telegramId));
  }

  // ─── Подключение через "Link with Phone Number" (pairing code) ────────────────
  async initClientWithPairingCode(
    telegramId: number,
    phone: string,
    onCode: (code: string) => Promise<void>,
    onReady: () => Promise<void>,
  ): Promise<void> {
    const existing = this.sockets.get(telegramId);
    if (existing?.ready) {
      await onReady();
      return;
    }
    if (existing) {
      try { existing.sock.end(undefined); } catch { /* ignore */ }
      this.sockets.delete(telegramId);
    }

    // Удаляем старую сессию — иначе WA отклоняет новый pairing code.
    const sessDir = this.sessionPath(telegramId);
    if (fs.existsSync(sessDir)) {
      fs.rmSync(sessDir, { recursive: true, force: true });
    }
    fs.mkdirSync(sessDir, { recursive: true });

    const { version } = await fetchLatestBaileysVersion();
    let readyFired = false;

    // После ввода кода WA шлёт disconnect 515 (restartRequired) — нужно
    // переподключиться с теми же credentials, тогда сработает connection=open.
    const createSocket = async (): Promise<WASocket> => {
      const { state, saveCreds } = await useMultiFileAuthState(sessDir);

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: silentLogger,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        mobile: false,
      });

      this.sockets.set(telegramId, { sock, ready: false });
      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
          const e = this.sockets.get(telegramId);
          if (e) e.ready = true;
          this.logger.log(`WA connected for telegramId=${telegramId}`);
          if (!readyFired) {
            readyFired = true;
            try { await onReady(); } catch { /* ignore */ }
          }
          return;
        }
        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          this.logger.warn(`WA disconnected for telegramId=${telegramId}, code=${statusCode}`);
          if (statusCode === DisconnectReason.restartRequired) {
            // Нормальный перезапуск после принятия pairing code — переподключаемся.
            this.logger.log(`WA restart required for telegramId=${telegramId}, reconnecting...`);
            await createSocket();
          } else {
            this.sockets.delete(telegramId);
          }
        }
      });

      return sock;
    };

    const sock = await createSocket();

    // Ждём установки WS-соединения перед запросом кода.
    await new Promise((r) => setTimeout(r, 3000));

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(cleanPhone);
    await onCode(code);
  }

  isAuthenticated(telegramId: number): boolean {
    return this.sockets.get(telegramId)?.ready ?? false;
  }

  async destroyClient(telegramId: number): Promise<void> {
    const e = this.sockets.get(telegramId);
    if (e) {
      try { e.sock.end(undefined); } catch { /* ignore */ }
      this.sockets.delete(telegramId);
    }
  }

  // ─── Список групп (доступен после подключения) ────────────────────────────────
  async getAvailableGroups(telegramId: number): Promise<{ id: string; name: string }[]> {
    const entry = this.sockets.get(telegramId);
    if (!entry?.ready) return [];
    const groups = await entry.sock.groupFetchAllParticipating();
    return Object.entries(groups).map(([jid, meta]) => ({
      id: jid,
      name: (meta as any).subject as string,
    }));
  }

  // ─── Сохранение / получение / удаление выбранной группы ──────────────────────
  async saveGroup(telegramId: number, waGroupId: string, waGroupName: string): Promise<void> {
    await this.repo.upsert({ telegramId, waGroupId, waGroupName }, ['telegramId']);
  }

  async getSavedGroup(telegramId: number): Promise<BotUserWaGroup | null> {
    return this.repo.findOneBy({ telegramId });
  }

  async removeSavedGroup(telegramId: number): Promise<void> {
    await this.repo.delete({ telegramId });
  }

  private buildCaption(p: any): string {
    const toTag = (v: string) =>
      '#' + v.replace(/[^а-яёa-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const hashtags = [
      toTag(p.type),
      ...(p.materials ?? []).map(toTag),
      ...(p.colors ?? []).map(toTag),
      ...(p.sizes ?? []).map(toTag),
    ].join(' ');

    return (
      `Тип: ${p.type}\n` +
      `Цена: ${p.price}\n` +
      `Материалы: ${(p.materials ?? []).join(', ')}\n` +
      `Цвета: ${(p.colors ?? []).join(', ')}\n` +
      `Размеры: ${(p.sizes ?? []).join(', ')}\n` +
      (p.description ? `Описание: ${p.description}\n` : '') +
      `\n${hashtags}`
    );
  }

  // Хеш текстового и фото-контента — для определения изменений перед обновлением.
  private contentHash(product: any): string {
    const caption = this.buildCaption(product);
    const photos = [product.photos[0], ...(product.extraPhotos ?? [])].join('|');
    return `${caption}||${photos}`;
  }

  // ─── Отправка карточки товара в WA-группу ────────────────────────────────────
  // Порядок: сначала доп. фото, потом основная карточка с описанием.
  async sendProductCard(
    telegramId: number,
    product: any,
  ): Promise<{ groupId: string; keys: any[]; contentHash: string }> {
    const entry = this.sockets.get(telegramId);
    if (!entry?.ready) throw new Error('WhatsApp не подключён.');

    const group = await this.getSavedGroup(telegramId);
    if (!group) throw new Error('WA-группа не выбрана.');

    const caption = this.buildCaption(product);
    const extraPhotos: string[] = product.extraPhotos ?? [];
    const keys: any[] = [];

    // Сначала доп. фото (без подписи)
    for (const photoPath of extraPhotos) {
      const fullPath = path.join(process.cwd(), photoPath.replace(/^\//, ''));
      const result = await entry.sock.sendMessage(group.waGroupId, {
        image: { url: fullPath },
      });
      if (result?.key) keys.push(result.key);
    }

    // Потом основное фото с карточкой товара
    const mainPhotoPath = path.join(process.cwd(), product.photos[0].replace(/^\//, ''));
    const mainResult = await entry.sock.sendMessage(group.waGroupId, {
      image: { url: mainPhotoPath },
      caption,
    });
    if (mainResult?.key) keys.push(mainResult.key);

    return { groupId: group.waGroupId, keys, contentHash: this.contentHash(product) };
  }

  // ─── Удаление карточки из WA-группы ──────────────────────────────────────────
  async deleteProductCard(
    telegramId: number,
    publishedWaPost: { groupId: string; keys: any[]; contentHash?: string },
  ): Promise<void> {
    const entry = this.sockets.get(telegramId);
    if (!entry?.ready) return;
    for (const key of publishedWaPost.keys) {
      try {
        await entry.sock.sendMessage(publishedWaPost.groupId, { delete: key });
      } catch { /* ignore individual failures */ }
    }
  }

  // ─── Обновление карточки в WA-группе ─────────────────────────────────────────
  // Сравнивает контент: если ничего не изменилось — не трогает группу.
  async updateProductCard(
    telegramId: number,
    publishedWaPost: { groupId: string; keys: any[]; contentHash?: string },
    product: any,
  ): Promise<{ groupId: string; keys: any[]; contentHash: string }> {
    const newHash = this.contentHash(product);
    if (publishedWaPost.contentHash && publishedWaPost.contentHash === newHash) {
      return publishedWaPost as { groupId: string; keys: any[]; contentHash: string };
    }
    await this.deleteProductCard(telegramId, publishedWaPost);
    return this.sendProductCard(telegramId, product);
  }
}
