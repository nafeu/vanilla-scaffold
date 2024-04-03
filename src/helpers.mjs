import { readFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import fetch from 'node-fetch';

export const executeCommand = (command) =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        reject(stderr);
        return;
      }
      resolve(stdout);
    });
  });

export const createDirectory = async (path) => {
  try {
    await mkdir(path);
    console.log(`[ vanilla-scaffold ] Directory created at: ${path}`);
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.error(
        `[ vanilla-scaffold ] Directory already exists at: ${path}`
      );
      process.exit(1);
    } else {
      throw error;
    }
  }
};

export const initiateGitRepo = async (name) => {
  try {
    await executeCommand(
      `cd ${name} && git init && git add --all && git commit -m "Initial commit."`
    );
  } catch (error) {
    console.error(error);
  }
};

export const openBuild = async (name) => {
  try {
    await executeCommand(`${process.env.EDITOR || '$EDITOR'} ${name}/`);
    await executeCommand(`open ${name}/index.html`);
  } catch (error) {
    console.error('[ vanilla-scaffold ] Could not open build', error);
  }
};

export const createRepository = async ({ token, repoData }) => {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(repoData),
    });
    if (!response.ok) {
      const errorDetails = await response.json();
      throw new Error(`Error: ${response.status} ${errorDetails.message}`);
    }
    const data = await response.json();
    console.log(
      '[ vanilla-scaffold ] Repository created successfully. URL:',
      data.html_url
    );
    return data.html_url;
  } catch (error) {
    console.error('[ vanilla-scaffold ] Error creating repository:', error);
  }
};

export const enableGitHubPages = async ({ owner, repo, token }) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: { branch: 'main', path: '/' } }),
      }
    );
    if (!response.ok) {
      throw new Error(`GitHub API responded with status: ${response.status}`);
    }
    console.log('[ vanilla-scaffold ] GitHub Pages enabled successfully');
  } catch (error) {
    console.error('[ vanilla-scaffold ] Failed to enable GitHub Pages:', error);
  }
};

export const connectRepoToGithub = async ({ name, htmlUrl }) => {
  try {
    const stdout = await executeCommand(
      `cd ${name} && git remote add origin ${htmlUrl} && git branch -M main && git push -u origin main`
    );

    console.log('[ vanilla-scaffold ] Repo connected to github', stdout);
  } catch (error) {
    console.error(error);
  }
};

export const interpolateTemplate = async ({ templatePath, templateValues }) => {
  let fileContent;

  try {
    fileContent = await readFile(templatePath, 'utf-8');

    // eslint-disable-next-line no-restricted-syntax
    for (const [template, replacement] of Object.entries(templateValues)) {
      const templateRegExp = new RegExp(`{{${template}}}`, 'g');
      fileContent = fileContent.replace(templateRegExp, replacement);
    }
  } catch (error) {
    console.log(`[ vanilla-scaffold ] Could not interpolate template`, error);
    process.exit(1);
  }

  return fileContent;
};

export const toKebabCase = (str) => {
  return (
    str
      .replace(/\s+/g, '-')
      // eslint-disable-next-line no-useless-escape
      .replace(/[^a-zA-Z0-9\-]/g, '')
      // eslint-disable-next-line no-useless-escape
      .replace(/\-{2,}/g, '-')
      .toLowerCase()
  );
};
