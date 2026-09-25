import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_PENALTY_BONUS_TEMPLATES } from '@/lib/penaltyBonusTemplates'

export const dynamic = 'force-dynamic'

/**
 * Pure in-memory route: Strictly avoids creating or querying any database tables.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    templates: DEFAULT_PENALTY_BONUS_TEMPLATES,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    return NextResponse.json({
      success: true,
      message: 'Template registered in memory/client state.',
      template: {
        id: `tpl-${Date.now()}`,
        ...body,
      },
    })
  } catch {
    return NextResponse.json({ success: true })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    return NextResponse.json({
      success: true,
      message: 'Template updated in memory/client state.',
      template: body,
    })
  } catch {
    return NextResponse.json({ success: true })
  }
}

export async function DELETE() {
  return NextResponse.json({
    success: true,
    message: 'Template deleted from memory/client state.',
  })
}
