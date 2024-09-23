import { configDotenv } from "dotenv";
import { graphql } from "@octokit/graphql";
import { ConvertToExcel } from "./convertToExcel.js";
configDotenv();

async function getTopRepos(token) {

    const { search: { edges } } = await graphql({
        query: `query SearchTopRepos($queryString: String!){
            search(query: $queryString, type: REPOSITORY, first: 100) {
                edges {
                    node {
                        ... on Repository {
                            nameWithOwner
                        }
                    }
                }
            }
        }`,
        queryString: "language:JavaScript stars:>20000 forks:>500",
        headers: {
            authorization: `Bearer ${token}`,
        },
    });

    return edges.map(edge => edge.node.nameWithOwner)
}

async function getPaths(token, owner, repo) {
    return graphql({
        query: `query GetTree($owner: String!, $repo: String!, $ref: String!){
                        repository(owner: $owner, name: $repo) {
                            object(expression: $ref) {
                                ... on Tree {
                                    entries {
                                        path
                                        type
                                    }
                                }
                            }
                        }
                    }`,
        owner,
        repo,
        ref: "HEAD:",
        headers: {
            authorization: `Bearer ${token}`,
        },
    })
        .then((res) => {
            const { repository: { object: { entries } } } = res
            return [
                entries.filter((e) => e.type === "tree").map((e) => e.path),
                `${owner}/${repo}`,
            ];
        })
        .catch((err) => {
            console.error(err.message);
            throw err;
        });
}

async function getFilteredRepos(token, repos) {
    const pathPromises = repos.map((repo) =>
        getPaths(token, repo.split("/")[0], repo.split("/")[1])
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

    const repos = await getTopRepos(github_token);
    const required_repos = repos
        .map((repo, index) => {
            if (index % 3 === 1) return repo;
        })
        .filter((repo) => repo);
    const filteredRepos = await getFilteredRepos(github_token, required_repos);
    ConvertToExcel(filteredRepos);
}

main();
