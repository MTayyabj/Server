const reportService = require("../services/report.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { buildSimplePdf } = require("../utils/pdf");

const sendReport = (res, query, report) => {
  if (query.format === "pdf") {
    const pdf = buildSimplePdf({
      title: report.title,
      lines: [
        `Summary: ${JSON.stringify(report.summary)}`,
        "",
        ...report.lines,
      ],
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${report.title.toLowerCase().replace(/\s+/g, "-")}.pdf"`
    );
    return res.status(200).send(pdf);
  }

  return sendSuccess(res, {
    message: `${report.title} generated successfully`,
    data: {
      rows: report.rows,
      summary: report.summary,
    },
  });
};

const sales = asyncHandler(async (req, res) => {
  const report = await reportService.salesReport(req.query);
  return sendReport(res, req.query, report);
});

const expenses = asyncHandler(async (req, res) => {
  const report = await reportService.expensesReport(req.query);
  return sendReport(res, req.query, report);
});

const customerSummary = asyncHandler(async (req, res) => {
  const report = await reportService.customerSummary(req.query);
  return sendReport(res, req.query, report);
});

const supplierSummary = asyncHandler(async (req, res) => {
  const report = await reportService.supplierSummary(req.query);
  return sendReport(res, req.query, report);
});

const cashFlow = asyncHandler(async (req, res) => {
  const report = await reportService.cashFlow(req.query);
  return sendReport(res, req.query, report);
});

module.exports = {
  sales,
  expenses,
  customerSummary,
  supplierSummary,
  cashFlow,
};
