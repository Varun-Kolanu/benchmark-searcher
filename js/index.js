import { configDotenv } from "dotenv";
import { graphql } from "@octokit/graphql";
import { ConvertToExcel } from "./convertToExcel.js";
import { getFetchedRepos } from "./getReposFromXls.js";
configDotenv();

const token = process.env.GITHUB_TOKEN;

async function fetchRepos(after) {
    const {
        search: { edges, pageInfo },
    } = await graphql({
        query: `query SearchTopRepos($queryString: String!, $after: String){
            search(query: $queryString, type: REPOSITORY, first: 100, after: $after) {
                edges {
                    node {
                        ... on Repository {
                            nameWithOwner
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }`,
        queryString: "language:JavaScript stars:>20000 forks:>500 sort:forks",
        after,
        headers: {
            authorization: `Bearer ${token}`,
        },
    });

    return {repos: edges.map((edge) => edge.node.nameWithOwner), pageInfo};
}

async function getAllTopRepos() {
    let allRepos = [];
    let hasNextPage = true;
    let after = null;

    let index = 0
    while (hasNextPage) {
        const result = await fetchRepos(after);
        allRepos = [...allRepos, ...result.repos]
        
        hasNextPage = result.pageInfo.hasNextPage;
        after = result.pageInfo.endCursor;
        index++

        if (index >= 2) break
    }
    return allRepos;
}

async function getPaths(owner, repo) {
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
            const {
                repository: {
                    object: { entries },
                },
            } = res;
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

async function getFilteredRepos(repos) {
    const pathPromises = repos.map((repo) =>
        getPaths(repo.split("/")[0], repo.split("/")[1])
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

async function getRepos() {
    const repos = await getAllTopRepos();
    const required_repos = repos
        .map((repo, index) => {
            // if (index % 3 === 1) return repo;
            return repo
        })
        .filter((repo) => repo);
    let filteredRepos = await getFilteredRepos(required_repos);
    filteredRepos = [["Repo URL", "Github Moniker"], ...filteredRepos.map(repo => [repo.github_url, repo.moniker])]
    ConvertToExcel(filteredRepos, "reposSortedAccToForks200");
}

async function getIssues(text) {
    let regex = "(close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\\s+#(\\d+)";
    regex = new RegExp(regex, "gi");
    let matches = []
    var m
    do {
        m = regex.exec(text);
        if (m) {
            matches.push(m[0]);
        }
    } while (m);
    const issuesSolving = matches.map(match => Number(match.split("#")[1]))
    return issuesSolving
}

async function fetchPRs(repo, after) {
    const {
        search: { edges, pageInfo },
    } = await graphql({
        query: `query SearchPRs($queryString: String!, $after: String){
            search(query: $queryString, type: ISSUE, first: 40, after: $after) {
                edges {
                    node {
                        ... on PullRequest{
                        number
                        title
                        createdAt
                        body
                        baseRefOid
                        headRefOid
                        additions
                        deletions
                        changedFiles
                        commits(first: 10) {
                            edges {
                                node {
                                    commit {
                                        oid
                                        message
                                        authoredDate
                                    }
                                }
                            }
                        }
                        files(first: 100) {
                            edges {
                            node {
                                path
                            }
                            }
                        }
                        comments(first: 10) {
                            edges {
                                node {
                                    body
                                    createdAt
                                }
                            }
                        }
                    }
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }`,
        queryString: `repo:${repo} is:pr is:merged NOT docs NOT chore NOT build in:title created:>2022-09-22 sort:comments-desc`,
        after,
        headers: {
            authorization: `Bearer ${token}`,
        },
    });


    let prs = []

    edges.forEach(async prEdge => {
        const pr = prEdge.node
        let texts = []
        texts.push(pr.title, pr.body)
        const commitEdges = pr.commits.edges
        commitEdges.forEach(commitEdge => {
            const commit = commitEdge.node.commit
            texts.push(commit.message)
        })
        const textBody = texts.join(" ")
        const issuesSolving = await getIssues(textBody)

        const files = pr.files.edges.map(fileEdge => fileEdge.node.path)
        const fileContainTests = files.some(file => file.includes("test/") || file.includes("tests/"))

        if (issuesSolving.length !== 0 && fileContainTests) {
            const date = new Date(pr.createdAt);
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            const formattedDate = date.toLocaleDateString('en-US', options);

            // const firstCommitDate = new Date(commitEdges[0].node.commit.authoredDate)
            // let hintsTexts = []
            // pr.comments.edges.forEach(edge => {
            //     const comment = edge.node
            //     const createdAt = new Date(comment.createdAt)
            //     if (createdAt < firstCommitDate) {
            //         hintsTexts.push(comment.body)
            //     }
            // })
            // const hintsText = hintsTexts.join(". ")

            const prInfo = {
                "repo": repo,
                "github_url": `https://github.com/${repo}`,
                "pull_number": pr.number,
                "pr_link": `https://github.com/${repo}/pull/${pr.number}`,
                "instance_id": `${repo.split("/")[0]}__${repo.split("/")[1]}-${pr.number}`,
                "issue_numbers": issuesSolving.join(", "),
                "base_commit": pr.baseRefOid,
                "env_install_commit": pr.headRefOid,
                "num_files": pr.changedFiles,
                "files": files.join(", "),
                "additions": pr.additions,
                "deletions": pr.deletions,
                "created_at": `${pr.createdAt}/${formattedDate}`,
            }
            prs.push(prInfo)
        }
    })

    return { prs, pageInfo }
}

async function getAllPRs(repo) {
    let allPRs = [];
    let hasNextPage = true;
    let after = null;

    let index = 0
    while (hasNextPage) {
        const result = await fetchPRs(repo, after);
        allPRs = [...allPRs, ...result.prs]
        
        // hasNextPage = false
        hasNextPage = result.pageInfo.hasNextPage;
        after = result.pageInfo.endCursor;
        index++

        if (index >= 4) break
    }
    return allPRs;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getPrsData() {
    // const repos = ["fastify/fastify"];
    const repos = getFetchedRepos("reposSortedAccToForks200").slice(1);
    
    const headers = [
        "repo",
        "github_url",
        "pull_number",
        "pr_link",
        "instance_id",
        "issue_numbers",
        "base_commit",
        "env_install_commit",
        "num_files",
        "files",
        "additions",
        "deletions",
        "created_at",
    ]
    
    let results = []
    
    for (let i=0; i<100; i+=6) {
        let prPromises = []
        repos.slice(i, Math.min(i+6,108)).forEach(repo => {
            prPromises.push(getAllPRs(repo))
        })
        let resultTemp = await Promise.all(prPromises)
        console.log(`${i+1} repos completed`)

        results = [...results,...resultTemp.flat()]

        await delay(50000);
    }


    results = results.sort((a,b) => {
        if (a.repo.toLowerCase() < b.repo.toLowerCase()) return -1
        if (a.repo.toLowerCase() > b.repo.toLowerCase()) return 1

        if (a.num_files > b.num_files) return -1
        if (a.num_files < b.num_files) return 1
        return 0
    })
    const prInfos = results.map(result => Object.values(result))
    const prs = [headers, ...prInfos]
    ConvertToExcel(prs, "PRsCollectedForEvaluation-all-forksort200");

}

// getRepos();
getPrsData()