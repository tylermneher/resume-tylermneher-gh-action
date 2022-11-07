const github = require("@actions/github");
const puppeteer = require("puppeteer-core");

// for testing only
// require("dotenv").config();

const getFileSha = async (octokit, pdfPath, owner, repo, branch = "resume") => {
  const pdfContent = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: pdfPath,
    ref: `heads/${branch}`,
  });
  return pdfContent.data.sha;
};

const getPdfBase64 = async () => {
  const URL = "https://tylermneher.github.io/tylermneher-resume/";
  const domSelector = "#resume-wrap";
  const browserFetcher = puppeteer.createBrowserFetcher();
  let revisionInfo = await browserFetcher.download("884014");

  browser = await puppeteer.launch({
    executablePath: revisionInfo.executablePath,
    args: ["--no-sandbox", "--disabled-setupid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: "networkidle2" });
  const desiredHtml = await page.$eval(domSelector, (element) => {
    return element.innerHTML;
  });

  await page.setContent(desiredHtml, { waitUntil: "networkidle2" });
  await page.evaluateHandle("document.fonts.ready");

  // create a pdf buffer with my preffered settings
  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: false,
    pageRanges: "1",
    printBackground: true,
    margin: "none",
  });
  await browser.close();
  return pdfBuffer.toString("base64");
};

const getDateTime = () => {
  let currentdate = new Date();
  return (datetime =
    "Last Sync: " +
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    " @ " +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes());
};

const uploadToRepo = async (
  octokit,
  pdfPath,
  pdfBase64,
  owner,
  repo,
  branch = `main`
) => {
  const fileSha = await getFileSha(octokit, pdfPath, owner, repo, branch);
  const datetime = getDateTime();
  const result = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch,
    message: `updating Resume pdf, ${datetime}`,
    path: pdfPath,
    content: pdfBase64,
    sha: fileSha,
  });
  console.log(`Created commit at ${result.data.commit.html_url}`);
};

const main = async () => {
  let GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  const octokit = github.getOctokit(GITHUB_TOKEN);

  const OWNER = "tylermneher";
  const REPO = "tylermneher-resume";
  const BRANCH = "download";
  const PDF_PATH = "tylermneher-resume.pdf";
  const pdfBase64 = await getPdfBase64();
  await uploadToRepo(octokit, PDF_PATH, pdfBase64, OWNER, REPO, BRANCH);
};

main();
