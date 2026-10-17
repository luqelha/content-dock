import Link from "next/link";

export function listPage(value?: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= 100000
    ? number
    : 1;
}
export function ListPagination({
  page,
  hasNext,
  path,
}: {
  page: number;
  hasNext: boolean;
  path: string;
}) {
  return (
    <nav
      aria-label="Result pages"
      className="flex items-center justify-between gap-4 p-4 text-sm"
    >
      {page > 1 ? (
        <Link className="underline" href={`${path}?page=${page - 1}`}>
          Previous page
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} - Up to 50 items per page. Filters apply to this page.
      </span>
      {hasNext ? (
        <Link className="underline" href={`${path}?page=${page + 1}`}>
          Next page
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
