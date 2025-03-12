import { Octokit } from '@octokit/rest'
import { context } from '@actions/github'
import { setFailed, info, getInput } from '@actions/core'

async function run() {
    try {
        const octokit = new Octokit({ auth: getInput('github-token', { required: true }) })

        const { owner, repo } = context.repo;
        const pullRequest = context.payload.pull_request;

        if (pullRequest && pullRequest.user.login === "dependabot[bot]") {
            // Format PR body
            const originalBody = pullRequest.body;
            const dependabotNote = "Dependabot will resolve any conflicts with this PR as long as you don't alter it yourself.";
            
            const purposeAndContextText = originalBody.split(dependabotNote)[0].trim();
            const purposeAndContext = `**Purpose and context**\n\n${purposeAndContextText}`;
            
            const changesMadeSentences = originalBody.split('\n').filter(line => line.startsWith('Updates') || line.startsWith('Bumps'));
            const changesMade = `**Changes made**\n\n${changesMadeSentences.map(sentence => `- ${sentence}`).join('\n')}`;
                
            const endNote = `🚧 **Reasons why this PR is \`tech\`**\nWe are upgrading libraries\n\n🔗 **Useful links**\n\n🔄 [Git Development Lifecycle guidelines](https://www.google.com)`

            const newBody = `${purposeAndContext}\n\n${changesMade}\n\n${endNote}`;

            // Fetch the list of files changed in the pull request
            const { data: files } = await octokit.pulls.listFiles({
                owner,
                repo,
                pull_number: pullRequest.number
            });

            // Check if any files are in the "frontend" or "backend" directories
            let prefix = "";
            if (files.some(file => file.filename.includes("frontend"))) {
                prefix = "(Web - FE) ";
            } else if (files.some(file => file.filename.includes("backend"))) {
                prefix = "(Web - BE) ";
            }

            // Update the pull request title with the prefix
            const newTitle = `${prefix}${pullRequest.title}`;

            await octokit.pulls.update({
                owner,
                repo,
                pull_number: pullRequest.number,
                title: newTitle,
                body: newBody
            });
            console.log(`Updated PR #${pullRequest.number}`);
        } else {
            console.log('PR not created by dependabot');
        }
    } catch (error) {
		console.error('Error:', error)
		process.exit(1)
	}
}

run().catch(err => {
	console.error(err)
	process.exit(1)
})