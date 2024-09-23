import { configDotenv } from "dotenv";
import { Octokit } from "@octokit/rest";
import { ConvertToExcel } from "./convertToExcel.js";
configDotenv();

async function getTopRepos(octokit) {
    const query = "language:JavaScript stars:>20000 forks:>500";

    const repos = await octokit.rest.search.repos({
        q: query,
        per_page: "100",
    });
    return repos.data.items.map((it) => it.full_name);
}

async function getPaths(octokit, owner, repo) {
    return octokit.rest.git
        .getTree({
            owner,
            repo,
            tree_sha: "HEAD",
        })
        .then((res) => {
            return [
                res.data.tree.filter((tr) => tr.type === "tree").map((tr) => tr.path),
                `${owner}/${repo}`,
            ];
        })
        .catch((err) => {
            console.error(err.message);
            throw err;
        });
}

async function getFilteredRepos(octokit, repos) {
    const pathPromises = repos.map((repo) =>
        getPaths(octokit, repo.split("/")[0], repo.split("/")[1])
    );

    return Promise.all(pathPromises)
        .then((results) => {
            return results
                .filter((result) => result[0].some((path) => path.includes("test")))
                .map((result) => ({
                    moniker: result[1],
                    github_url: `https://github.com/${result[1]}`,
                }));
        })
        .catch((err) => {
            console.error(err.message);
        });
}

async function main() {
    const github_token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({
        auth: github_token,
    });

    const repos = await getTopRepos(octokit);
    const required_repos = repos
        .map((repo, index) => {
            if (index % 3 === 1) return repo;
        })
        .filter((repo) => repo);
    const filteredRepos = await getFilteredRepos(octokit, required_repos);
    console.log(filteredRepos);
    ConvertToExcel(filteredRepos);
}

main();
