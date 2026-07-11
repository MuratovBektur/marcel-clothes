import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { generateImageVariants } from '../../libs/image-variants';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir = path.join(
    process.cwd(),
    'uploads',
    'products',
  );
  private readonly token = process.env.TELEGRAM_BOT_TOKEN!;

  constructor(private readonly http: HttpService) {
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveFromFileId(fileId: string): Promise<string> {
    // Get file path from Telegram
    const infoUrl = `https://api.telegram.org/bot${this.token}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const { data: info } = await firstValueFrom(this.http.get(infoUrl));
    const filePath: string = info.result.file_path;

    // Download the raw file
    const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
    const { data: arrayBuffer } = await firstValueFrom(
      this.http.get<ArrayBuffer>(downloadUrl, { responseType: 'arraybuffer' }),
    );
    const buffer = Buffer.from(arrayBuffer);

    const baseName = crypto.randomUUID();
    const rawExt = path.extname(filePath) || '.jpg';

    // Архивная копия исходных байт без обработки
    await fs.promises.writeFile(
      path.join(this.uploadDir, `${baseName}-raw${rawExt}`),
      buffer,
    );

    // Мастер (полное разрешение) + card/gallery/thumb варианты под конкретные UI-места
    await generateImageVariants(buffer, this.uploadDir, baseName);

    const filename = `${baseName}.webp`;
    this.logger.log(`Saved ${filename}`);
    return `/uploads/products/${filename}`;
  }

  async saveMany(fileIds: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const id of fileIds) {
      const url = await this.saveFromFileId(id);
      results.push(url);
    }
    return results;
  }
}
