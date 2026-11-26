"""Generate deterministic simulated omics sample datasets for Omisearch.

Produces:
  - sample_data/expression.csv    (200 genes x 12 samples, log2 expression values)
  - sample_data/annotations.csv   (6 control + 6 treated samples)
  - sample_data/interactions.csv  (400 STRING-style gene-gene interaction edges)
"""

from __future__ import annotations

import csv
from pathlib import Path
import random

SEED = 1
rng = random.Random(SEED)
OUTPUT_DIR = Path(__file__).resolve().parent

# Source: https://www.gsea-msigdb.org/gsea/msigdb/human/collections.jsp#H
# ("Gene symbols" .gmt file, viewed in GSEA app)
HALLMARK_ADIPOGENESIS = ["ABCA1","ABCB8","ACAA2","ACADL","ACADM","ACADS","ACLY","ACO2","ACOX1","ADCY6","ADIG","ADIPOQ","ADIPOR2","AGPAT3","AIFM1","AK2","ALDH2","ALDOA","ANGPT1","ANGPTL4","APLP2","APOE","ARAF","ARL4A","ATL2","ATP1B3","ATP5PO","BAZ2A","BCKDHA","BCL2L13","BCL6","C3","CAT","CAVIN1","CAVIN2","CCNG2","CD151","CD302","CD36","CDKN2C","CHCHD10","CHUK","CIDEA","CMBL","CMPK1","COL15A1","COL4A1","COQ3","COQ5","COQ9","COX6A1","COX7B","COX8A","CPT2","CRAT","CS","CYC1","CYP4B1","DBT","DDT","DECR1","DGAT1","DHCR7","DHRS7","DHRS7B","DLAT","DLD","DNAJB9","DNAJC15","DRAM2","ECH1","ECHS1","ELMOD3","ELOVL6","ENPP2","EPHX2","ESRRA","ESYT1","ETFB","FABP4","FAH","FZD4","G3BP2","GADD45A","GBE1","GHITM","GPAM","GPAT4","GPD2","GPHN","GPX3","GPX4","GRPEL1","HADH","HIBCH","HSPB8","IDH1","IDH3A","IDH3G","IFNGR1","IMMT","ITGA7","ITIH5","ITSN1","JAGN1","LAMA4","LEP","LIFR","LIPE","LPCAT3","LPL","LTC4S","MAP4K3","MCCC1","MDH2","ME1","MGLL","MGST3","MIGA2","MRAP","MRPL15","MTARC2","MTCH2","MYLK","NABP1","NDUFA5","NDUFAB1","NDUFB7","NDUFS3","NKIRAS1","NMT1","OMD","ORM1","PDCD4","PEMT","PEX14","PFKFB3","PFKL","PGM1","PHLDB1","PHYH","PIM3","PLIN2","POR","PPARG","PPM1B","PPP1R15B","PRDX3","PREB","PTCD3","PTGER3","QDPR","RAB34","REEP5","REEP6","RETN","RETSAT","RIOK3","RMDN3","RNF11","RREB1","RTN3","SAMM50","SCARB1","SCP2","SDHB","SDHC","SLC19A1","SLC1A5","SLC25A1","SLC25A10","SLC27A1","SLC5A6","SLC66A3","SNCG","SOD1","SORBS1","SOWAHC","SPARCL1","SQOR","SSPN","STAT5A","STOM","SUCLG1","SULT1A1","TALDO1","TANK","TKT","TOB1","TST","UBC","UBQLN1","UCK1","UCP2","UQCR10","UQCR11","UQCRC1","UQCRQ","VEGFB","YWHAG"]
HALLMARK_ALLOGRAFT_REJECTION = ["AARS1","ABCE1","ABI1","ACHE","ACVR2A","AKT1","APBB1","B2M","BCAT1","BCL10","BCL3","BRCA1","C2","CAPG","CARTPT","CCL11","CCL13","CCL19","CCL2","CCL22","CCL4","CCL5","CCL7","CCND2","CCND3","CCR1","CCR2","CCR5","CD1D","CD2","CD247","CD28","CD3D","CD3E","CD3G","CD4","CD40","CD40LG","CD47","CD7","CD74","CD79A","CD80","CD86","CD8A","CD8B","CD96","CDKN2A","CFP","CRTAM","CSF1","CSK","CTSS","CXCL13","CXCL9","CXCR3","DARS1","DEGS1","DYRK3","EGFR","EIF3A","EIF3D","EIF3J","EIF4G3","EIF5A","ELANE","ELF4","EREG","ETS1","F2","F2R","FAS","FASLG","FCGR2B","FGR","FLNA","FYB1","GALNT1","GBP2","GCNT1","GLMN","GPR65","GZMA","GZMB","HCLS1","HDAC9","HIF1A","HLA-A","HLA-DMA","HLA-DMB","HLA-DOA","HLA-DOB","HLA-DQA1","HLA-DRA","HLA-E","HLA-G","ICAM1","ICOSLG","IFNAR2","IFNG","IFNGR1","IFNGR2","IGSF6","IKBKB","IL10","IL11","IL12A","IL12B","IL12RB1","IL13","IL15","IL16","IL18","IL18RAP","IL1B","IL2","IL27RA","IL2RA","IL2RB","IL2RG","IL4","IL4R","IL6","IL7","IL9","INHBA","INHBB","IRF4","IRF7","IRF8","ITGAL","ITGB2","ITK","JAK2","KLRD1","KRT1","LCK","LCP2","LIF","LTB","LY75","LY86","LYN","MAP3K7","MAP4K1","MBL2","MMP9","MRPL3","MTIF2","NCF4","NCK1","NCR1","NLRP3","NME1","NOS2","NPM1","PF4","PRF1","PRKCB","PRKCG","PSMB10","PTPN6","PTPRC","RARS1","RIPK2","RPL39","RPL3L","RPL9","RPS19","RPS3A","RPS9","SIT1","SOCS1","SOCS5","SPI1","SRGN","ST8SIA4","STAB1","STAT1","STAT4","TAP1","TAP2","TAPBP","TGFB1","TGFB2","THY1","TIMP1","TLR1","TLR2","TLR3","TLR6","TNF","TPD52","TRAF2","TRAT1","UBE2D1","UBE2N","WARS1","WAS","ZAP70"]
# sets for faster lookups
HALLMARK_ADIPOGENESIS_SET = set(HALLMARK_ADIPOGENESIS)
HALLMARK_ALLOGRAFT_REJECTION_SET = set(HALLMARK_ALLOGRAFT_REJECTION)
# pick 25 randomly, while ensuring none of the genes picked for UP_GENES appear in DOWN_GENES (and vice-versa)
UP_GENES = rng.sample([gene for gene in HALLMARK_ADIPOGENESIS if gene not in set(HALLMARK_ALLOGRAFT_REJECTION_SET)], 25)
DOWN_GENES = rng.sample([gene for gene in HALLMARK_ALLOGRAFT_REJECTION if gene not in set(HALLMARK_ADIPOGENESIS_SET)], 25)
# 150 extra filler genes
BACKGROUND_GENES = [f"GENE_{i:03d}" for i in range(1, 151)]
# 200 genes in total
ALL_GENES = UP_GENES + DOWN_GENES + BACKGROUND_GENES

# 6 control samples, 6 treated samples
CONTROL_SAMPLES = [f"CTRL_{i}" for i in range(1, 7)]
TREATED_SAMPLES = [f"TRTD_{i}" for i in range(1, 7)]
ALL_SAMPLES = CONTROL_SAMPLES + TREATED_SAMPLES


def generate() -> None:
    

    # 1. annotations.csv
    annotations_path = OUTPUT_DIR / "annotations.csv"
    with annotations_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["sample", "group"])
        for sample in CONTROL_SAMPLES:
            writer.writerow([sample, "control"])
        for sample in TREATED_SAMPLES:
            writer.writerow([sample, "treated"])

    # 2. expression.csv (log2-scale values)
    expression_path = OUTPUT_DIR / "expression.csv"
    with expression_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        # genes are the rows, samples are the columns.
        writer.writerow(["gene", *ALL_SAMPLES])

        for gene in ALL_GENES:
            # A baseline range of 5 to 10. 
            # The typical range is 0 to 16 for log2 adjusted values (source: https://github.com/CODECRUNCHWORLDWIDE/C10-Crunching-Bioinformatics/blob/main/curriculum/week-07-transcriptomics-and-rna-seq/02-lecture-notes/03-counting-and-normalization-tpm-cpm.md#8-log-tpm-for-visualization)
            # To avoid potentially going over or under these limits with the below shifts, I constrained the baseline range further to 5-10.
            baseline = rng.uniform(5.0, 10.0)
            if gene in UP_GENES:
                # A random upward shift between 1.0 to 2.5.
                shift = rng.uniform(1.0, 2.5)
                # Some minor noise.
                sigma = 0.25
            elif gene in DOWN_GENES:
                # Negated as these are down-regulated genes.
                shift = -rng.uniform(1.0, 2.5)
                sigma = 0.25
            else:
                # background genes ("normal" baseline values with minor noise added)
                shift = 0.0
                sigma = 0.50

            row = [gene]
            for _ in CONTROL_SAMPLES:
                # we only add the noise (sigma) to the baseline, as are these control samples.
                val = max(0.0, baseline + rng.gauss(0.0, sigma))
                row.append(f"{val:.4f}")
            for _ in TREATED_SAMPLES:
                # we add both a large positive/negative adjustment (shift) and a small noise (sigma), as these are treated samples.
                val = max(0.0, baseline + shift + rng.gauss(0.0, sigma))
                row.append(f"{val:.4f}")
            writer.writerow(row)

    # 3. interactions.csv (400 undirected STRING-style edges)
    # confidence scores: >= 0.9: very high, >= 0.7: high, >= 0.4: medium, otherwise: low
    # Source: https://string-db.org/cgi/help (Getting Started > Navigation Buttons > Data Settings)
    def add_edge(
        target: dict[tuple[str, str], float],
        a: str,
        b: str,
        low: float,
        high: float,
    ) -> None:
        if a == b:
            return
        pair = (a, b) if a < b else (b, a)
        if pair not in target:
            target[pair] = round(rng.uniform(low, high), 3)

    # Dense up-regulated module (100 edges)
    edges_up: dict[tuple[str, str], float] = {}
    for i, g1 in enumerate(UP_GENES):
        # add high confidence edges between the gene and its two next neighbors
        add_edge(edges_up, g1, UP_GENES[(i + 1) % len(UP_GENES)], 0.75, 0.99)
        add_edge(edges_up, g1, UP_GENES[(i + 2) % len(UP_GENES)], 0.70, 0.95)
    # add more edges of varying confidence (medium to very high) until we've reached 100 in total.
    while len(edges_up) < 100:
        a, b = rng.sample(UP_GENES, 2)
        add_edge(edges_up, a, b, 0.65, 0.95)

    # Dense down-regulated module (100 edges)
    edges_down: dict[tuple[str, str], float] = {}
    for i, g1 in enumerate(DOWN_GENES):
        add_edge(edges_down, g1, DOWN_GENES[(i + 1) % len(DOWN_GENES)], 0.75, 0.99)
        add_edge(edges_down, g1, DOWN_GENES[(i + 2) % len(DOWN_GENES)], 0.70, 0.95)
    while len(edges_down) < 100:
        a, b = rng.sample(DOWN_GENES, 2)
        add_edge(edges_down, a, b, 0.65, 0.95)

    # Cross-module bridge edges, i.e., edges between up-regulated (UP_GENES) and down-regulated genes (DOWN_GENES) (20 edges)
    edges_bridges: dict[tuple[str, str], float] = {}
    while len(edges_bridges) < 20:
        a = rng.choice(UP_GENES)
        b = rng.choice(DOWN_GENES)
        add_edge(edges_bridges, a, b, 0.50, 0.85)

    # Merge modules, then add random edges across all genes to reach 400 total edges.
    # Pairings could include two BACKGROUND_GENES, a background gene to an UP/DOWN gene (mixed),
    # or even two UP/DOWN genes not previously linked.
    edges: dict[tuple[str, str], float] = {
        **edges_up,
        **edges_down,
        **edges_bridges,
    }
    while len(edges) < 400:
        a, b = rng.sample(ALL_GENES, 2)
        add_edge(edges, a, b, 0.40, 0.80)

    interactions_path = OUTPUT_DIR / "interactions.csv"
    with interactions_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        # The format mimics the STRING API endpoint /network, which, among other returned fields,
        # includes "preferredName_A", "preferredName_B" and "score".
        # Source: https://string-db.org/cgi/help?subpage=api%23getting-the-string-network-interactions
        writer.writerow(["gene_a", "gene_b", "score"])
        for (a, b), score in sorted(edges.items()):
            writer.writerow([a, b, f"{score:.3f}"])

    print(
        f"Generated {expression_path.name} ({len(ALL_GENES)} genes x {len(ALL_SAMPLES)} samples), "
        f"{annotations_path.name} ({len(ALL_SAMPLES)} rows), "
        f"{interactions_path.name} ({len(edges)} edges)."
    )


if __name__ == "__main__":
    generate()
