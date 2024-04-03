import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const TEMPLATES = {
  HTML_BASIC: join(__dirname, '../templates/template-index-html-basic.txt'),
  LICENSE: join(__dirname, '../templates/template-license.txt'),
  GITIGNORE: join(__dirname, '../templates/template-gitignore.txt'),
  README: join(__dirname, '../templates/template-readme.txt'),
};

export const ENV_PATH = join(__dirname, '../.env');

export const PACKAGE_JSON_PATH = join(__dirname, '../package.json');
