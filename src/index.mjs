import arg from 'arg';
import inquirer from 'inquirer';
import * as emoji from 'node-emoji';
import _ from 'lodash';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';

import {
  createDirectory,
  toKebabCase,
  openBuild,
  interpolateTemplate,
  initiateGitRepo,
  createRepository,
  connectRepoToGithub,
  enableGitHubPages,
} from './helpers.mjs';

import { TEMPLATES, ENV_PATH, PACKAGE_JSON_PATH } from './constants.mjs';

if (!existsSync(ENV_PATH)) {
  console.error('Error: .env file not found, run: cp .env-sample .env');
  process.exit(1);
}

const config = dotenv.config({ path: ENV_PATH });

if (config.error) {
  console.error('Error loading .env file');
  process.exit(1);
}

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      '--name': String,
      '--github-username': String,
      '--author': String,
      '--title': String,
      '--short-desc': String,
      '--desc': String,
      '--icon': String,
      '--buyMeACofeeUrl': String,
      '--use-jsonbin': Boolean,
      '--create-github-repo': Boolean,
      '--private-repo': Boolean,
      '--open-build': Boolean,
      '--force': Boolean,
      '--version': Boolean,
      '-n': '--name',
      '-g': '--github-username',
      '-a': '--author',
      '-t': '--title',
      '-s': '--short-desc',
      '-d': '--desc',
      '-i': '--icon',
      '-c': '--buy-me-a-coffee-url',
      '-j': '--use-jsonbin',
      '-r': '--create-github-repo',
      '-p': '--private-repo',
      '-o': '--open-build',
      '-f': '--force',
      '-v': '--version',
    },
    {
      argv: rawArgs.slice(2),
    }
  );
  return {
    name: args['--name'],
    githubUsername: args['--github-username'],
    author: args['--author'],
    title: args['--title'],
    shortDesc: args['--short-desc'],
    desc: args['--desc'],
    icon: args['--icon'],
    useJsonbin: args['--use-jsonbin'],
    createGithubRepo: args['--create-github-repo'],
    privateRepo: args['--private-repo'],
    openBuild: args['--open-build'],
    force: args['--force'],
    version: args['--version'],
  };
}

async function promptForMissingOptions(options) {
  if (options.version) {
    const { version } = JSON.parse(await readFile(PACKAGE_JSON_PATH, 'utf-8'));

    console.log(`v${version}`);

    process.exit(0);
  }

  const questions = [];

  if (_.isEmpty(options.name)) {
    questions.push({
      type: 'string',
      name: 'name',
      message: 'What is the name of your project? (will convert to kebab-case)',
      default: '',
    });
  }

  if (_.isEmpty(options.githubUsername)) {
    questions.push({
      type: 'string',
      name: 'githubUsername',
      message: 'What is your github username? (for github api actions)',
      default: process.env.GITHUB_USERNAME || '',
    });
  }

  if (_.isEmpty(options.author)) {
    questions.push({
      type: 'string',
      name: 'author',
      message: 'Who is the author of this project? (for credits and readme)',
      default: process.env.AUTHOR || '',
    });
  }

  if (_.isEmpty(options.title)) {
    questions.push({
      type: 'string',
      name: 'title',
      message:
        'What is the title of your project? (for app window label and readme)',
      default: '',
    });
  }

  if (_.isEmpty(options.shortDesc)) {
    questions.push({
      type: 'string',
      name: 'shortDesc',
      message:
        'What is a short description of your project? (for titles and headings)',
      default: '',
    });
  }

  if (_.isEmpty(options.desc)) {
    questions.push({
      type: 'string',
      name: 'desc',
      message:
        'What is a longer description of your project? (for README and meta)',
      default: '',
    });
  }

  if (_.isEmpty(options.icon)) {
    questions.push({
      type: 'string',
      name: 'icon',
      message: 'Name an emoji for your page icon',
      default: 'coffee',
    });
  }

  if (_.isEmpty(options.buyMeACoffeeUrl)) {
    questions.push({
      type: 'string',
      name: 'buyMeACoffeeUrl',
      message: 'Enter your buymeacoffee.com url (leave empty to skip)',
      default: process.env.BUY_ME_A_COFFEE_URL || '',
    });
  }

  if (_.isUndefined(options.useJsonbin)) {
    questions.push({
      type: 'confirm',
      name: 'useJsonbin',
      message: 'Would you like to use JSONBIN (for data storage)',
      default: false,
    });
  }

  if (_.isUndefined(options.createGithubRepo)) {
    questions.push({
      type: 'confirm',
      name: 'createGithubRepo',
      message: 'Would you like to automate your github repo creation?',
      default: false,
    });
  }

  if (_.isUndefined(options.privateRepo)) {
    questions.push({
      type: 'confirm',
      name: 'privateRepo',
      message: 'Would you like to make your repo private?',
      default: true,
    });
  }

  if (_.isUndefined(options.openBuild)) {
    questions.push({
      type: 'confirm',
      name: 'openBuild',
      message: 'Would you like to open your build folder on completion?',
      default: true,
    });
  }

  let answers = await inquirer.prompt(questions);

  const missingName = _.isEmpty(answers.name || options.name);
  const missingGithubUsername = _.isEmpty(
    answers.githubUsername || options.githubUsername
  );
  const missingAuthor = _.isEmpty(answers.author || options.author);
  const missingTitle = _.isEmpty(answers.title || options.title);
  const missingShortDesc = _.isEmpty(answers.shortDesc || options.shortDesc);
  const missingDesc = _.isEmpty(answers.desc || options.desc);

  while (
    missingName ||
    missingGithubUsername ||
    missingAuthor ||
    missingTitle ||
    missingShortDesc ||
    missingDesc
  ) {
    // eslint-disable-next-line no-await-in-loop
    answers = await inquirer.prompt(questions);
  }

  const finalOptions = {
    ...options,
    name: options.name || answers.name,
    githubUsername: options.githubUsername || answers.githubUsername,
    author: options.author || answers.author,
    title: options.title || answers.title,
    shortDesc: options.shortDesc || answers.shortDesc,
    desc: options.desc || answers.desc,
    icon: emoji.get(options.icon || answers.icon),
    buyMeACoffeeUrl: options.buyMeACoffeeUrl || answers.buyMeACoffeeUrl,
    useJsonbin: options.useJsonbin || answers.useJsonbin,
    privateRepo: options.privateRepo || answers.privateRepo,
    createGithubRepo: options.createGithubRepo || answers.createGithubRepo,
    openBuild: options.openBuild || answers.openBuild,
  };

  if (!options.force) {
    _.each(finalOptions, (value, key) => {
      if (value !== undefined && value !== null && value !== '') {
        console.log(`${key}: ${value}`);
      }
    });

    const finalizeOptions = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to continue with these options?',
        default: true,
      },
    ]);

    if (!finalizeOptions.continue) {
      console.log(`[ vanilla-scaffold ] Cancelling scaffold...`);
      process.exit(0);
    }
  }

  return finalOptions;
}

export async function handleOptions(options) {
  try {
    const projectName = toKebabCase(options.name);

    createDirectory(projectName);

    await writeFile(
      `${projectName}/index.html`,
      await interpolateTemplate({
        templatePath: TEMPLATES.HTML_BASIC,
        templateValues: options,
      })
    );

    await writeFile(
      `${projectName}/LICENSE`,
      await interpolateTemplate({
        templatePath: TEMPLATES.LICENSE,
        templateValues: options,
      })
    );

    await writeFile(
      `${projectName}/README.md`,
      await interpolateTemplate({
        templatePath: TEMPLATES.README,
        templateValues: options,
      })
    );

    await writeFile(
      `${projectName}/.gitignore`,
      await readFile(TEMPLATES.LICENSE, 'utf-8')
    );

    await initiateGitRepo(projectName);

    if (options.createGithubRepo) {
      const htmlUrl = await createRepository({
        token: process.env.GITHUB_ACCESS_TOKEN,
        repoData: {
          name: projectName,
          description: options.desc,
          private: options.privateRepo,
        },
      });

      await connectRepoToGithub({ name: projectName, htmlUrl });

      await enableGitHubPages({
        token: process.env.GITHUB_ACCESS_TOKEN,
        owner: options.githubUsername,
        repo: projectName,
      });
    }

    if (options.openBuild) {
      await openBuild(projectName);
    }
  } catch (error) {
    console.error('[ vanilla-scaffold ] Error processing output file:', error);
  }
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  handleOptions(options);
}
