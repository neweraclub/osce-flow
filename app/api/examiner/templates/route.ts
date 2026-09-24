import { NextRequest, NextResponse } from 'next/server'
import {
  getPenaltyBonusTemplatesAction,
  createPenaltyBonusTemplateAction,
  updatePenaltyBonusTemplateAction,
  deletePenaltyBonusTemplateAction,
} from '@/app/actions/penaltyBonusTemplates'

export async function GET() {
  try {
    const res = await getPenaltyBonusTemplatesAction()
    return NextResponse.json(res)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await createPenaltyBonusTemplateAction(body)
    return NextResponse.json(res, { status: res.success ? 201 : 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ success: false, error: 'Template ID required.' }, { status: 400 })
    const res = await updatePenaltyBonusTemplateAction(id, data)
    return NextResponse.json(res)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'Template ID required.' }, { status: 400 })
    const res = await deletePenaltyBonusTemplateAction(id)
    return NextResponse.json(res)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 })
  }
}
