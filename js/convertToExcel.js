import { utils, writeFile } from 'xlsx';

export function ConvertToExcel(repos, fileName) {
    const wb = utils.book_new();
    const wsData = repos; 
    const ws = utils.aoa_to_sheet(wsData); 

    utils.book_append_sheet(wb, ws, 'Sheet1');

    const filePath = `./${fileName}.xlsx`;
    writeFile(wb, filePath);

    console.log(`Excel file written to ${filePath}`);
}
