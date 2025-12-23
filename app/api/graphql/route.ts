import { type NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";
import { createGraphQLClient } from "@/lib/graphql/client";

/**
 * API route che agisce come proxy per le query GraphQL verso Sorare
 * Aggiunge automaticamente il token JWT se presente nei cookies
 */
export async function POST(request: NextRequest) {
  try {
    // Ottieni il token JWT dai cookies
    const token = await getAuthToken();

    // Crea il client GraphQL con o senza autenticazione
    const client = createGraphQLClient(token);

    // Ottieni il body della richiesta (query GraphQL)
    const body = await request.json();

    // Esegui la richiesta
    const data = await client.request(body.query, body.variables);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GraphQL proxy error:", error);

    // Gestisci errori GraphQL
    if (error instanceof Error && "response" in error) {
      const errorResponse = error as {
        response?: { errors?: Array<{ message: string }> };
      };
      if (errorResponse.response?.errors) {
        return NextResponse.json(
          { errors: errorResponse.response.errors },
          { status: 400 }
        );
      }
    }

    // Errore generico
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute GraphQL query",
      },
      { status: 500 }
    );
  }
}

// Supporta anche le richieste OPTIONS per CORS (se necessario in futuro)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
