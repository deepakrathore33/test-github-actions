// collect-feedback-actions.js
import { Octokit } from '@octokit/rest';
import { config } from 'dotenv';

config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

(async () => {
  const owner = 'deepakrathore33';
  const repo = 'test-gha';
  const label = 'collecting-feedback';
  const retriageLabel = 'untriaged';

  // Get issues with 'collecting feedback' label
  const issues = await octokit.issues.listForRepo({
    owner,
    repo,
    labels: label,
    state: 'open',
    per_page: 100,
  });

  const now = new Date();
  for (const issue of issues.data) {
    const createdAt = new Date(issue.created_at);
    const ageInMonths = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth());

    // Check upvotes (reactions)
    const reactions = await octokit.reactions.listForIssue({
      owner,
      repo,
      issue_number: issue.number,
      per_page: 100,
    });

    const upvotes = reactions.data.filter(reaction => reaction.content === '+1').length;

    if (upvotes >= 1) {
      // Remove 'collecting feedback' label and add 'retriage' label
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: issue.number,
        name: label,
      });

      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: issue.number,
        labels: [retriageLabel],
      });

      console.log(`Issue #${issue.number} moved to retriage due to upvotes.`);
    } else if (ageInMonths > 6) {
      // Close issue
      await octokit.issues.update({
        owner,
        repo,
        issue_number: issue.number,
        state: 'closed',
      });

      console.log(`Issue #${issue.number} closed due to inactivity.`);
    }
  }
})();