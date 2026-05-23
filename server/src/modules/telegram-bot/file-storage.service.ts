import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

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

    // Optimize: resize to max 1200px wide, convert to WebP
    const filename = `${crypto.randomUUID()}.webp`;
    const dest = path.join(this.uploadDir, filename);

    await sharp(Buffer.from(arrayBuffer))
      .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(dest);

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
