import { NextRequest, NextResponse } from 'next/server'
import { PUT as mainPUT, DELETE as mainDELETE } from '../route'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const body = await req.json()
  const enrichedBody = { ...body, id: resolvedParams.id }
  
  const mockReq = new NextRequest(req.url, {
    method: 'PUT',
    headers: req.headers,
    body: JSON.stringify(enrichedBody),
  })

  return mainPUT(mockReq)
}

export const PATCH = PUT

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const url = new URL(req.url)
  url.searchParams.set('id', resolvedParams.id)
  
  const mockReq = new NextRequest(url.toString(), {
    method: 'DELETE',
    headers: req.headers,
  })

  return mainDELETE(mockReq)
}
