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
} from './helpers.mjs';

import { TEMPLATES } from './constants.mjs';

if (!existsSync('.env')) {
  console.error('Error: .env file not found, run: cp .env-sample .env');
  process.exit(1);
}

const config = dotenv.config();

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
      '--use-jsonbin': Boolean,
      '--private-repo': Boolean,
      '--open-build': Boolean,
      '-n': '--name',
      '-g': '--github-username',
      '-a': '--author',
      '-t': '--title',
      '-s': '--short-desc',
      '-d': '--desc',
      '-i': '--icon',
      '-j': '--use-jsonbin',
      '-p': '--private-repo',
      '-o': '--open-build',
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
    privateRepo: args['--private-repo'],
    openBuild: args['--open-build'],
  };
}

async function promptForMissingOptions(options) {
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

  if (_.isUndefined(options.useJsonbin)) {
    questions.push({
      type: 'confirm',
      name: 'useJsonbin',
      message: 'Would you like to use JSONBIN (for data storage)',
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

  return {
    ...options,
    name: options.name || answers.name,
    githubUsername: options.githubUsername || answers.githubUsername,
    author: options.author || answers.author,
    title: options.title || answers.title,
    shortDesc: options.shortDesc || answers.shortDesc,
    desc: options.desc || answers.desc,
    icon: emoji.get(options.icon || answers.icon),
    useJsonbin: options.useJsonbin || answers.useJsonbin,
    privateRepo: options.privateRepo || answers.privateRepo,
    openBuild: options.openBuild || answers.openBuild,
  };
}

export async function handleOptions(options) {
  try {
    const newDirectory = toKebabCase(options.name);

    createDirectory(newDirectory);

    await writeFile(
      `${newDirectory}/index.html`,
      interpolateTemplate({
        templatePath: TEMPLATES.HTML_BASIC,
        templateValues: options,
      })
    );

    await writeFile(
      `${newDirectory}/LICENSE`,
      interpolateTemplate({
        templatePath: TEMPLATES.LICENSE,
        templateValues: options,
      })
    );

    await writeFile(
      `${newDirectory}/README.md`,
      interpolateTemplate({
        templatePath: TEMPLATES.README,
        templateValues: options,
      })
    );

    await writeFile(
      `${newDirectory}/.gitignore`,
      await readFile(TEMPLATES.LICENSE, 'utf-8')
    );

    if (options.openBuild) {
      openBuild(newDirectory);
    }
  } catch (error) {
    console.error('Error processing output file:', error.message);
  }
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  handleOptions(options);
}
