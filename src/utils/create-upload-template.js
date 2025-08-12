const ExcelJS = require('exceljs');
const path = require('path');

async function createUploadTemplate() {
    console.log('📝 Creating lead upload template...');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads Template');
    
    // Add headers with proper column mapping for tblmaster table
    worksheet.columns = [
        { header: 'First Name*', key: 'firstName', width: 20 },
        { header: 'Last Name*', key: 'lastName', width: 20 },
        { header: 'Email ID', key: 'emailId', width: 30 },
        { header: 'Contact Number*', key: 'contactNumber', width: 20 },
        { header: 'Call Status', key: 'callstatus', width: 20 },
        { header: 'Remarks', key: 'remarks', width: 30 },
        { header: 'Posting Date', key: 'postingDate', width: 15 },
        { header: 'Call By*', key: 'callby', width: 20 },
        { header: 'Submit On', key: 'submiton', width: 15 },
        { header: 'Product Name', key: 'productname', width: 20 },
        { header: 'Unit Type', key: 'unittype', width: 15 },
        { header: 'Budget', key: 'budget', width: 15 },
        { header: 'Follow Up', key: 'followup', width: 20 }
    ];
    
    // Add header row
    worksheet.addRow([
        'First Name*', 'Last Name*', 'Email ID', 'Contact Number*', 'Call Status', 
        'Remarks', 'Posting Date', 'Call By*', 'Submit On', 'Product Name', 
        'Unit Type', 'Budget', 'Follow Up'
    ]);
    
    // Add sample data rows
    worksheet.addRow(['John', 'Smith', 'john.smith@gmail.com', '9876543210', 'New Buyer', 'Interested in 3BHK', '2024-03-15', 'john', '2024-03-15', 'Apartment', '3BHK', '5000000', 'High Priority']);
    worksheet.addRow(['Sarah', 'Johnson', 'sarah.j@gmail.com', '8765432109', 'Resale - Seller', 'Has 2BHK to sell', '2024-03-15', 'jane', '2024-03-15', 'Apartment', '2BHK', '3500000', 'Medium Priority']);
    worksheet.addRow(['Michael', 'Brown', 'michael.b@gmail.com', '7654321098', 'New Buyer', 'Looking for Villa', '2024-03-15', 'bob', '2024-03-15', 'Villa', '4BHK', '15000000', 'Low Priority']);
    worksheet.addRow(['Emma', 'Wilson', 'emma.w@gmail.com', '6543210987', 'Resale - Buyer', 'Interested in Plot', '2024-03-15', 'alice', '2024-03-15', 'Plot', '1000 sq ft', '8000000', 'High Priority']);
    
    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
    };
    
    // Style sample data rows
    for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
        };
    }
    
    // Add data validation for Call Status column
    worksheet.dataValidations.add('E2:E1000', {
        type: 'list',
        allowBlank: true,
        formulae: ['"New Buyer,Resale - Buyer,Resale - Seller,Not Interested,Follow Up"'],
        promptTitle: 'Call Status',
        prompt: 'Select call status from the list',
        errorTitle: 'Invalid Call Status',
        error: 'Please select a valid call status from the list'
    });
    
    // Add data validation for Unit Type column
    worksheet.dataValidations.add('K2:K1000', {
        type: 'list',
        allowBlank: true,
        formulae: ['"1BHK,2BHK,3BHK,4BHK,5BHK,Villa,Plot,Commercial,Office,Shop"'],
        promptTitle: 'Unit Type',
        prompt: 'Select unit type from the list',
        errorTitle: 'Invalid Unit Type',
        error: 'Please select a valid unit type from the list'
    });
    
    // Add instructions
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
        { header: 'Instructions', key: 'instructions', width: 80 }
    ];
    
    instructionsSheet.addRow(['LEAD UPLOAD TEMPLATE INSTRUCTIONS']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['REQUIRED FIELDS (marked with *):']);
    instructionsSheet.addRow(['• First Name*: Lead\'s first name']);
    instructionsSheet.addRow(['• Last Name*: Lead\'s last name']);
    instructionsSheet.addRow(['• Contact Number*: Lead\'s phone number']);
    instructionsSheet.addRow(['• Call By*: Username of the person making the call']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['OPTIONAL FIELDS:']);
    instructionsSheet.addRow(['• Email ID: Lead\'s email address']);
    instructionsSheet.addRow(['• Call Status: Current status of the lead']);
    instructionsSheet.addRow(['• Remarks: Additional notes about the lead']);
    instructionsSheet.addRow(['• Posting Date: Date when lead was posted (defaults to today)']);
    instructionsSheet.addRow(['• Submit On: Date when lead was submitted (defaults to today)']);
    instructionsSheet.addRow(['• Product Name: Type of property/product']);
    instructionsSheet.addRow(['• Unit Type: Size/type of unit']);
    instructionsSheet.addRow(['• Budget: Lead\'s budget range']);
    instructionsSheet.addRow(['• Follow Up: Priority level for follow-up']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['IMPORTANT NOTES:']);
    instructionsSheet.addRow(['• All leads will be imported into the tblmaster table']);
    instructionsSheet.addRow(['• Dates will default to current date if not provided']);
    instructionsSheet.addRow(['• Contact Number must be unique for each lead']);
    instructionsSheet.addRow(['• Maximum file size: 10MB']);
    instructionsSheet.addRow(['• Supported format: .xlsx files only']);
    instructionsSheet.addRow(['']);
    instructionsSheet.addRow(['SAMPLE DATA:']);
    instructionsSheet.addRow(['• Row 1: New buyer interested in 3BHK apartment']);
    instructionsSheet.addRow(['• Row 2: Resale seller with 2BHK apartment']);
    instructionsSheet.addRow(['• Row 3: New buyer looking for villa']);
    instructionsSheet.addRow(['• Row 4: Resale buyer interested in plot']);
    
    // Style instructions
    const instructionsHeader = instructionsSheet.getRow(1);
    instructionsHeader.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    instructionsHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
    };
    
    const filePath = path.join(__dirname, 'lead-upload-template.xlsx');
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`✅ Template created: ${filePath}`);
    console.log('📋 Template includes:');
    console.log('   - Sample data rows');
    console.log('   - Data validation for Call Status and Unit Type');
    console.log('   - Detailed instructions');
    console.log('   - Proper column mapping to tblmaster table');
    
    return filePath;
}

// Run if executed directly
if (require.main === module) {
    createUploadTemplate()
        .then(() => {
            console.log('\n🎉 Template creation completed!');
            console.log('📤 You can now use this template for lead uploads.');
        })
        .catch(console.error);
}

module.exports = createUploadTemplate;
