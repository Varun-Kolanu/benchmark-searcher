import { utils, writeFile } from 'xlsx';

export function ConvertToExcel(repos) {
    const wb = utils.book_new();
    const wsData = [["Repo URL", "Github Moniker"], ...repos.map(repo => [repo.github_url, repo.moniker])]; 
    const ws = utils.aoa_to_sheet(wsData); 

    utils.book_append_sheet(wb, ws, 'Sheet1');

    const filePath = './reposFiltered2.xlsx';
    writeFile(wb, filePath);

    console.log(`Excel file written to ${filePath}`);
}
