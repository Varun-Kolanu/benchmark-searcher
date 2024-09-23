package main

import (
	"fmt"
	"log"
	"os"

	"github.com/Varun-Kolanu/benchmark-searcher/utils"
	"github.com/joho/godotenv"
	"github.com/xuri/excelize/v2"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file")
	}

	gitHubToken := os.Getenv("GITHUB_TOKEN")

	topRepos := utils.GetTopRepos(gitHubToken)
	requiredRepos := []string{}
	for ind, repo := range topRepos {
		if ind%3 == 2 {
			requiredRepos = append(requiredRepos, repo)
		}
	}
	data := utils.GetFilteredRepos(requiredRepos, gitHubToken)
	fmt.Println(data)

	f := excelize.NewFile()

	for i, value := range data {
		cell := fmt.Sprintf("A%d", i+1)
		err := f.SetCellValue("Sheet1", cell, value)
		if err != nil {
			log.Fatalf("Error writing to Excel file: %v", err)
		}
	}

	if err := f.SaveAs("reposFiltered.xlsx"); err != nil {
		log.Fatalf("Error saving the Excel file: %v", err)
	}

	fmt.Println("Excel file created successfully!")
}
