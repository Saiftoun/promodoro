# Project rules

Project: FocusRoom (Pomodoro co-working web app). Spec: pomodoro-room-project.html
Jira site: saiftounsi.atlassian.net, project key: PROM. Backlog = PROM-1 to PROM-60.

## Workflow for every task
1. Read the Jira issue (summary, description, acceptance criteria) before coding.
2. Move the issue to "In Progress".
3. Create a branch from main named: PROM-<number>-short-description
   Example: PROM-24-server-timer-state
4. Commit messages MUST start with the issue key: "PROM-<number>: what changed"
   Example: PROM-24: store timer state on the server
5. Push the branch and open a pull request titled "PROM-<number>: ...".
6. Add a Jira comment with a summary, then move the issue to the next status.

## Hard rules
- Never commit directly to main. One branch per Jira issue.
- Never skip hooks (no --no-verify).
- Never commit secrets (.env, API keys). Use environment variables.
- Work on one issue at a time, in the order of the backlog epics.
- Only the host can control the timer, assign tasks, and view screens, and the SERVER must enforce it.