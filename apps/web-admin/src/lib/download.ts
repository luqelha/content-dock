/**
 * Utility to force download a file from a URL instead of opening it directly in the browser.
 */
export async function downloadFile(
  url: string,
  suggestedFilename?: string,
): Promise<void> {
  const fallbackFilename = url.split("/").pop() || "download";
  const filename = suggestedFilename || fallbackFilename;

  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    }, 150);
  } catch (error) {
    console.warn(
      "Direct blob download failed, falling back to anchor trigger:",
      error,
    );
    // Fallback: anchor with download attribute
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 150);
  }
}
