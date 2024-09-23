package utils

import (
	"fmt"
	"log"
	"sort"
	"strings"
	"sync"

	"github.com/imroc/req/v3"
)

const url = "https://api.github.com/repos"

type Node struct {
	Path string `json:"path"`
}

type SearchResultTrees struct {
	Tree []Node `json:"tree"`
}

type reposAndNames struct {
	Index int
	Name  string
}

func worker(index int, wg *sync.WaitGroup, results *[]reposAndNames, mu *sync.Mutex, repo, token string) {
	defer wg.Done()
	client := req.C()

	resp, err := client.R().
		SetHeader("Accept", "application/vnd.github+json").
		SetHeader("Authorization", "Bearer "+token).
		SetHeader("X-GitHub-Api-Version", "2022-11-28").
		Get(fmt.Sprintf("%s/%s/git/trees/HEAD", url, repo))

	if err != nil {
		log.Fatalf("Error: %v", err)
	}

	var result SearchResultTrees
	if err := resp.UnmarshalJson(&result); err != nil {
		log.Fatalf("Failed to parse response: %v", err)
	}

	tree := result.Tree
	for _, node := range tree {
		if strings.Contains(node.Path, "test") {
			mu.Lock()
			*results = append(*results, reposAndNames{index, repo})
			mu.Unlock()
			break
		}
	}
}

func GetFilteredRepos(repos []string, token string) []string {

	var wg sync.WaitGroup
	var mu sync.Mutex
	results := []reposAndNames{}

	for ind, repo := range repos {
		wg.Add(1)
		go worker(ind, &wg, &results, &mu, repo, token)
	}

	wg.Wait()
	fmt.Println("Results collected:")
	sort.Slice(results, func(i, j int) bool {
		return results[i].Index < results[j].Index
	})

	repoNames := []string{}
	for _, res := range results {
		repoNames = append(repoNames, "https://github.com/"+res.Name)
	}
	return repoNames
}
