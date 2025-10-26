async function createPot(db, params) {
    const { data, error } = await db
        .from('pots')
        .insert([{ hand_id: params.hand_id, pot_index: params.pot_index, cap_amount: params.cap_amount ?? null }])
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function upsertContribution(db, params) {
    const { data, error } = await db
        .from('pot_contributions')
        .upsert({ pot_id: params.pot_id, player_id: params.player_id, contributed: params.contributed }, { onConflict: 'pot_id,player_id' })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
module.exports = { createPot, upsertContribution };
