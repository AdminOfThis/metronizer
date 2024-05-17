// GitHub repository details
const owner = "AdminOfThis";
const repo = "Metronizer";

function setup() {
  noCanvas();
  fetchCommits();
}

// Fetch the latest commits
async function fetchCommits() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`
    );
    const commits = await response.json();
    displayCommits(commits);
  } catch (error) {
    console.error("Error fetching commits:", error);
  }
}

// Display the commits on the HTML page
function displayCommits(commits) {
  const commitsDiv = createDiv().id("commits");

  commits.forEach((commit) => {
    const commitDiv = createDiv().class("commit");

    const message = createP(`Message: ${commit.commit.message}`).parent(
      commitDiv
    );
    const author = createP(`Author: ${commit.commit.author.name}`).parent(
      commitDiv
    );
    const date = createP(
      `Date: ${new Date(commit.commit.author.date).toLocaleString()}`
    ).parent(commitDiv);

    commitDiv.parent(commitsDiv);
  });
}
