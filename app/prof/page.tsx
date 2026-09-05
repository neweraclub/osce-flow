import { redirect } from 'next/navigation'

export default function ProfIndexRedirect() {
  redirect('/professor/dashboard')
}
