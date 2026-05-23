/**
 * Local stub types for pdfmake.
 *
 * We deliberately don't depend on `@types/pdfmake` (the official
 * package). Its transitive `@types/pdfkit` carries a
 * `/// <reference types="node">` directive that activates Node's
 * built-in module declarations — most notably `declare module
 * "constants"` — which then shadows this codebase's `'constants'`
 * workspace alias (`src/constants/index.ts`) everywhere it's
 * imported. Every `from 'constants'` resolves to `node:constants`
 * instead, breaking the whole build.
 *
 * Workspace policy is to keep `'constants'` resolving to local
 * `src/constants/`, so we skip the upstream types and declare just
 * enough surface area to compile our PDF generator (`exportTripPdf`).
 * If we ever need richer typing — themes, advanced layout APIs,
 * custom fonts — extend this stub rather than re-introducing
 * @types/pdfmake.
 */

declare module 'pdfmake/build/pdfmake' {
    import type { TDocumentDefinitions } from 'pdfmake/interfaces';

    interface PdfDownloadable {
        download(filename?: string): void;
        open(): void;
        print(): void;
        getBlob(callback: (blob: Blob) => void): void;
    }

    interface PdfMake {
        vfs: Record<string, string>;
        fonts?: Record<string, unknown>;
        createPdf(documentDefinition: TDocumentDefinitions): PdfDownloadable;
        addVirtualFileSystem?(vfs: Record<string, string>): void;
    }

    const pdfMake: PdfMake;
    export default pdfMake;
}

/** Side-effect import — attaches the bundled Roboto font into
 *  pdfMake.vfs via the module's IIFE. No exports we care about. */
declare module 'pdfmake/build/vfs_fonts';

declare module 'pdfmake/interfaces' {
    // We use a permissive shape rather than mirroring pdfmake's full
    // typescript surface (~500 lines). This is enough for the PDF
    // generator to compile and for editors to give us key completion
    // on the common fields we actually use.
    export type Alignment = 'left' | 'right' | 'center' | 'justify';
    export type PageSize = 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL' | string;

    export interface ContentText {
        text: string | Array<string | ContentText>;
        bold?: boolean;
        italics?: boolean;
        fontSize?: number;
        color?: string;
        alignment?: Alignment;
        margin?: [number, number, number, number] | number;
        pageBreak?: 'before' | 'after';
        style?: string | string[];
    }

    export interface ContentColumns {
        columns: Content[];
        columnGap?: number;
        alignment?: Alignment;
    }

    export interface ContentStack {
        stack: Content[];
        margin?: [number, number, number, number] | number;
    }

    export interface ContentTable {
        table: {
            widths?: Array<number | 'auto' | '*'>;
            headerRows?: number;
            body: TableCell[][];
            dontBreakRows?: boolean;
        };
        layout?: string | TableLayout;
        margin?: [number, number, number, number] | number;
        alignment?: Alignment;
    }

    export interface ContentUnorderedList {
        ul: Array<string | Content>;
        margin?: [number, number, number, number] | number;
    }

    export type Content =
        | string
        | ContentText
        | ContentColumns
        | ContentStack
        | ContentTable
        | ContentUnorderedList
        | { svg: string; width?: number; height?: number }
        | { image: string; width?: number; height?: number }
        | { text: string; pageBreak: 'before' | 'after' }
        | Record<string, unknown>;

    export interface TableCellSpecific {
        rowSpan?: number;
        colSpan?: number;
        fillColor?: string;
        border?: [boolean, boolean, boolean, boolean];
        alignment?: Alignment;
        bold?: boolean;
        color?: string;
        margin?: [number, number, number, number] | number;
        italics?: boolean;
    }

    export type TableCell =
        | (ContentText & TableCellSpecific)
        | (ContentStack & TableCellSpecific)
        | (ContentUnorderedList & TableCellSpecific)
        | (Record<string, unknown> & TableCellSpecific);

    export interface TableLayout {
        hLineWidth?: (i: number, node: unknown) => number;
        vLineWidth?: (i: number, node: unknown) => number;
        hLineColor?: (i: number, node: unknown) => string;
        vLineColor?: (i: number, node: unknown) => string;
        paddingLeft?: (i: number, node: unknown) => number;
        paddingRight?: (i: number, node: unknown) => number;
        paddingTop?: (i: number, node: unknown) => number;
        paddingBottom?: (i: number, node: unknown) => number;
    }

    export interface TDocumentDefinitions {
        content: Content[];
        pageSize?: PageSize;
        pageMargins?: [number, number, number, number] | number;
        defaultStyle?: {
            fontSize?: number;
            color?: string;
            font?: string;
            bold?: boolean;
        };
        styles?: Record<string, Record<string, unknown>>;
        info?: { title?: string; author?: string; subject?: string };
        header?: Content;
        footer?: Content | ((currentPage: number, pageCount: number) => Content);
    }
}
