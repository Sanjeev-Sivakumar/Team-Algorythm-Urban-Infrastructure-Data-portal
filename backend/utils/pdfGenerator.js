const PDFDocument = require('pdfkit');

exports.generateDashboardPDF = (stats, res) => {
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=dashboard_report.pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Urban Infrastructure Dashboard Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Total Assets: ${stats.total_assets}`);
    doc.text(`Active Assets: ${stats.active_assets}`);
    doc.text(`Under Maintenance: ${stats.under_maintenance_assets}`);
    doc.text(`Total Maintenance Records: ${stats.total_maintenance_records}`);
    doc.text(`Total Maintenance Cost: ₹${stats.total_maintenance_cost}`);

    doc.moveDown();
    doc.text('Status Distribution:');

    stats.status_distribution.forEach(status => {
        doc.text(`${status.status}: ${status.count}`);
    });

    doc.end();
};