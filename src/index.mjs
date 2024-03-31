import arg from 'arg';
import inquirer from 'inquirer';
import * as emoji from 'node-emoji';
import _ from 'lodash';

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      '--name': String,
      '--short-desc': String,
      '--desc': String,
      '--icon': String,
      '--use-jsonbin': Boolean,
      '--private-repo': Boolean,
      '-n': '--name',
      '-s': '--short-desc',
      '-d': '--description',
      '-i': '--icon',
      '-j': '--use-jsonbin',
      '-p': '--private-repo',
    },
    {
      argv: rawArgs.slice(2),
    }
  );
  return {
    name: args['--name'],
    shortDesc: args['--short-desc'],
    desc: args['--desc'],
    icon: args['--icon'],
    useJsonbin: args['--use-jsonbin'],
    privateRepo: args['--private-repo'],
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

  let answers = await inquirer.prompt(questions);

  const missingName = _.isEmpty(answers.name || options.name);
  const missingShortDesc = _.isEmpty(answers.shortDesc || options.shortDesc);
  const missingDesc = _.isEmpty(answers.desc || options.desc);

  while (missingName || missingShortDesc || missingDesc) {
    // eslint-disable-next-line no-await-in-loop
    answers = await inquirer.prompt(questions);
  }

  return {
    ...options,
    name: options.name || answers.name,
    shortDesc: options.shortDesc || answers.shortDesc,
    desc: options.desc || answers.desc,
    icon: emoji.get(options.icon || answers.icon),
    useJsonbin: options.useJsonbin || answers.useJsonbin,
    privateRepo: options.privateRepo || answers.privateRepo,
  };
}

export function handleOptions(options) {
  console.log(`Handling options:\n${JSON.stringify(options, null, 2)}`);
}

export async function cli(args) {
  let options = parseArgumentsIntoOptions(args);
  options = await promptForMissingOptions(options);
  handleOptions(options);
}
