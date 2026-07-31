export function mapSupabaseMemory(row) {
  return {
    id: row.id,
    guestName: row.guest_name,
    table: row.table_name || 'Sin mesa',
    relation: row.relation || 'Invitado',
    moment: row.moment,
    uploadedAt: row.created_at,
    fileName: row.file_name,
    filePath: row.file_path,
    type: row.file_type,
    previewUrl: row.public_url,
    thumbUrl: row.thumb_url || null,
    accent: row.file_type === 'video' ? 'olive' : 'champagne',
    approved: row.approved,
  }
}
