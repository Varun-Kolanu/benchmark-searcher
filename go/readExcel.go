package main

import (
	"fmt"
	"log"

	"github.com/xuri/excelize/v2"
)

func ReadExcel() {
	f, err := excelize.OpenFile("ReposHavingTestsInTop100Popular2.xlsx")
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	// sheetName := f.GetSheetName(1)
	// fmt.Println(sheetName)
	rows, err := f.GetRows("Sheet1")
	if err != nil {
		log.Fatal(err)
	}

	if len(rows) < 1 {
		log.Fatal("No data found")
	}

	data := []string{}
	for _, row := range rows {
		data = append(data, row...)
	}

	fmt.Println(data)
}
