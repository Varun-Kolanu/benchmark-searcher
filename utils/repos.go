package utils

import (
	"log"

	"github.com/imroc/req/v3"
)

type Repository struct {
	FullName string `json:"full_name"`
}

type SearchResult struct {
	Items []Repository `json:"items"`
}

func GetTopRepos(token string) []string {
	client := req.C()

	url := "https://api.github.com/search/repositories"
	query := "language:JavaScript stars:>20000 forks:>500"

	resp, err := client.R().
		SetHeader("Accept", "application/vnd.github+json").
		SetHeader("Authorization", "Bearer "+token).
		SetHeader("X-GitHub-Api-Version", "2022-11-28").
		SetQueryParam("q", query).
		SetQueryParam("per_page", "100").
		SetQueryParam("page", "1").
		Get(url)

	if err != nil {
		log.Fatalf("Error: %v", err)
	}

	var result SearchResult
	if err := resp.UnmarshalJson(&result); err != nil {
		log.Fatalf("Failed to parse response: %v", err)
	}

	var fullNames []string
	for _, repo := range result.Items {
		fullNames = append(fullNames, repo.FullName)
	}

	// fmt.Println("Full Names of Repositories:", fullNames)
	return fullNames
}
