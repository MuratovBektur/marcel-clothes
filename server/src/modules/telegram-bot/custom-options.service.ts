import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SUIT_TYPES, MATERIALS, COLORS, SIZES } from './constants';

type OptionType = 'suitTypes' | 'materials' | 'colors' | 'sizes';

interface CustomOptionsData {
  suitTypes: string[];
  materials: string[];
  colors: string[];
  sizes: string[];
}

@Injectable()
export class CustomOptionsService implements OnModuleInit {
  private readonly dataPath = path.join(process.cwd(), 'data', 'custom-options.json');
  private data: CustomOptionsData;

  onModuleInit() {
    this.load();
  }

  private load() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
    } catch {
      this.data = {
        suitTypes: [...SUIT_TYPES],
        materials: [...MATERIALS],
        colors: [...COLORS],
        sizes: [...SIZES.default],
      };
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  getOptions(type: OptionType): string[] {
    return [...this.data[type]];
  }

  // Prepends value to the list; if it already exists, moves it to front.
  // List size stays fixed (last item is dropped when a genuinely new item is added).
  addCustomOption(type: OptionType, value: string) {
    const list = this.data[type];
    const maxSize = list.length;
    const existing = list.indexOf(value);
    if (existing !== -1) list.splice(existing, 1);
    list.unshift(value);
    if (list.length > maxSize) list.splice(maxSize);
    this.save();
  }
}
