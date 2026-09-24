import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'
import { DEFAULT_PENALTY_BONUS_TEMPLATES } from '@/lib/penaltyBonusTemplates'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: true, templates: DEFAULT_PENALTY_BONUS_TEMPLATES })
    }

    const formatted = data.map((t: any) => ({
      id: t.id,
      professor_id: t.professor_id,
      type: t.type,
      title: t.title,
      default_value: Number(t.default_value),
      default_note: t.default_note || '',
      created_at: t.created_at,
      updated_at: t.updated_at,
    }))

    const existingTitles = new Set(formatted.map((t) => t.title.toLowerCase().trim()))
    const remainingPresets = DEFAULT_PENALTY_BONUS_TEMPLATES.filter(
      (p) => !existingTitles.has(p.title.toLowerCase().trim())
    )

    return NextResponse.json({ success: true, templates: [...formatted, ...remainingPresets] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title required.' }, { status: 400 })
    }

    const absValue = Math.abs(Number(body.default_value) || 0)
    const finalValue = body.type === 'penalty' ? -absValue : absValue

    const { data, error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .insert({
        professor_id: body.professor_id || null,
        type: body.type || 'penalty',
        title: body.title.trim(),
        default_value: finalValue,
        default_note: body.default_note?.trim() || null,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, template: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'Template ID required.' }, { status: 400 })

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (data.title !== undefined) updatePayload.title = data.title.trim()
    if (data.default_note !== undefined) updatePayload.default_note = data.default_note.trim()
    if (data.type !== undefined) updatePayload.type = data.type
    if (data.default_value !== undefined) {
      const absValue = Math.abs(Number(data.default_value) || 0)
      const isPenalty = data.type ? data.type === 'penalty' : Number(data.default_value) < 0
      updatePayload.default_value = isPenalty ? -absValue : absValue
    }

    const { data: updated, error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, template: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'Template ID required.' }, { status: 400 })

    if (id.startsWith('preset-')) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
