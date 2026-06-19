/**
 * Used by .github/workflows/template-compatibility-comment.yml.
 * Reads /tmp/compat-results from the prior workflow's artifact and posts or
 * removes a PR comment via the GitHub API.
 */
module.exports = async ({ github, context }) => {
  const fs = require('fs');

  const read = (filename) => {
    try {
      return fs.readFileSync(`/tmp/compat-results/${filename}`, 'utf8').trim();
    } catch {
      return '';
    }
  };

  // Validate PR number — must be a positive integer.
  const prNumber = parseInt(read('pr-number.txt'), 10);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    console.log('Invalid or missing PR number in artifact; skipping comment.');
    return;
  }

  const exitCode = read('exit-code.txt');
  const fullOutput = read('output.txt');
  // Sanitize values read from the artifact before embedding in markdown
  // to prevent injection (e.g. a malicious branch name or script output
  // containing markdown syntax that escapes a code fence).
  const templatesRef = read('templates-ref.txt').replace(/[^a-zA-Z0-9._\/-]/g, '');
  const headRef = read('head-ref.txt').replace(/[^a-zA-Z0-9._\/-]/g, '');

  const marker = '<!-- template-compat-comment -->';

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
  });
  const existing = comments.find((c) => c.body.includes(marker));

  if (exitCode === '0') {
    // Templates pass — remove any stale failure comment.
    if (existing) {
      await github.rest.issues.deleteComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existing.id,
      });
    }
    return;
  }

  // Extract just the "Results" and "Failure Details" sections from output.
  const resultsMatch = fullOutput.match(/={8,}\nResults:.*\n={8,}[\s\S]*/);
  const failureSummary = resultsMatch ? resultsMatch[0].trim() : fullOutput.trim();

  const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.payload.workflow_run.id}`;
  const refNote =
    templatesRef === 'main'
      ? 'tested against `cre-templates:main`'
      : `tested against \`cre-templates:${templatesRef}\` (compat branch)`;

  const body = [
    '## ⚠️ Template Compatibility Failures',
    '',
    `This PR breaks one or more templates in [cre-templates](https://github.com/smartcontractkit/cre-templates) (${refNote}).`,
    '',
    '```',
    failureSummary,
    '```',
    '',
    `[View full output →](${runUrl})`,
    '',
    '<details>',
    '<summary>What should I do?</summary>',
    '',
    '- **Accidental break:** Fix the SDK change so existing templates continue to compile.',
    `- **Intentional breaking change:** Create a branch in \`cre-templates\` named \`compat/${headRef}\` with the template fixes applied. This job will automatically retest against that branch.`,
    '',
    '</details>',
  ].join('\n');

  const commentBody = `${marker}\n${body}`;

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body: commentBody,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: commentBody,
    });
  }
};
