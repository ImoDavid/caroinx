import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn<Row> = {
  /** Stable identity for the column; also the React key. */
  id: string;
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  /** Applied to both the header and body cells, so alignment stays in one place. */
  className?: string;
  /**
   * For an action column whose header would otherwise be an empty <th>. The
   * header text is still rendered for screen readers.
   */
  srOnlyHeader?: boolean;
};

export type DataTableProps<Row> = {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  /** Describes the table for screen readers. Visually hidden. */
  caption: string;
  /** Rendered in place of the body when there are no rows. */
  empty?: React.ReactNode;
};

/**
 * A presentational table over a column definition.
 *
 * Not a Client Component on purpose: `cell` is a render function, and keeping
 * this on the server means those functions never have to cross a serialization
 * boundary. Callers can still return client components from `cell`.
 *
 * shadcn's `Table` already wraps itself in an `overflow-x-auto` container, so a
 * wide table scrolls inside its own box and never pushes the page sideways.
 */
export function DataTable<Row>({ columns, rows, getRowKey, caption, empty }: DataTableProps<Row>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={cn("whitespace-nowrap", column.className)}>
              {column.srOnlyHeader ? (
                <span className="sr-only">{column.header}</span>
              ) : (
                column.header
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={getRowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.id} className={column.className}>
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
