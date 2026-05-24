def calcular_puntos_partido(goles_local_pron: int, goles_vis_pron: int,
                             goles_local_real: int, goles_vis_real: int,
                             pts_exacto: int = 3, pts_ganador: int = 1) -> int:
    # Resultado exacto
    if goles_local_pron == goles_local_real and goles_vis_pron == goles_vis_real:
        return pts_exacto

    # Solo ganador o empate correcto
    def resultado(gl, gv):
        if gl > gv: return 1
        if gl < gv: return -1
        return 0

    if resultado(goles_local_pron, goles_vis_pron) == resultado(goles_local_real, goles_vis_real):
        return pts_ganador

    return 0