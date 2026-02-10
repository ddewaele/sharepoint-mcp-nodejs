export class GraphApiError extends Error {
  public statusCode: number;
  public graphCode: string | undefined;

  constructor(message: string, statusCode: number, graphCode?: string) {
    super(message);
    this.name = "GraphApiError";
    this.statusCode = statusCode;
    this.graphCode = graphCode;
  }
}
