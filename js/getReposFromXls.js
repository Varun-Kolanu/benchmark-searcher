import XLSX from 'xlsx';

export function getFetchedRepos(fileName) {
    const filePath = `./${fileName}.xlsx`; // Replace with your file path
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets["Sheet1"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const repos = data.map(row => row[1]).filter(value => value !== undefined);
    return repos
}

// getFetchedRepos()
