import { NextRequest, NextResponse } from 'next/server'
import {
  getStationTemplatesAction,
  createStationTemplateItemAction,
  updateStationTemplateItemAction,
  deleteStationTemplateItemAction,
} from '@/app/actions/penaltyBonusTemplates'
import { DEFAULT_PENALTY_BONUS_TEMPLATES } from '@/lib/penaltyBonusTemplates'

export const dynamic = 'force-dynamic'

/**
 * Serves station_criteria (points < 0) and station_bonuses (points > 0) directly from Supabase.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stationId = searchParams.get('station_id')

    if (stationId) {
      const result = await getStationTemplatesAction(stationId)
      return NextResponse.json({
        success: true,
        templates: result.templates,
      })
    }

    return NextResponse.json({
      success: true,
      templates: DEFAULT_PENALTY_BONUS_TEMPLATES,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await createStationTemplateItemAction(body)
    return NextResponse.json(result, { status: result.success ? 201 : 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    const result = await updateStationTemplateItemAction(id, data)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const type = (searchParams.get('type') as 'bonus' | 'penalty') || 'penalty'
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })

    const result = await deleteStationTemplateItemAction(id, type)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
