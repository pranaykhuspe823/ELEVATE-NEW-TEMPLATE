# Clusters of interchangeable terms for ATS keyword matching. Each inner list
# is a group of forms that should all count as a match for one another (e.g.
# a resume containing "JS" should satisfy a required keyword of "javascript").
# Lowercase, matches the normalization already applied before comparison.
SYNONYM_CLUSTERS: list[list[str]] = [
    ["javascript", "js"],
    ["typescript", "ts"],
    ["python", "py"],
    ["machine learning", "ml"],
    ["artificial intelligence", "ai"],
    ["natural language processing", "nlp"],
    ["amazon web services", "aws"],
    ["google cloud platform", "gcp", "google cloud"],
    ["microsoft azure", "azure"],
    ["continuous integration", "ci"],
    ["continuous deployment", "continuous delivery", "cd"],
    ["ci/cd", "ci cd", "continuous integration continuous deployment"],
    ["kubernetes", "k8s"],
    ["infrastructure as code", "iac"],
    ["search engine optimization", "seo"],
    ["pay per click", "ppc"],
    ["customer relationship management", "crm"],
    ["key performance indicators", "kpis", "kpi"],
    ["user experience", "ux"],
    ["user interface", "ui"],
    [
        "application programming interface", "api", "apis", "rest apis", "rest api",
        "restful", "restful api", "restful apis", "restful services", "web api", "web apis",
    ],
    ["structured query language", "sql"],
    ["node.js", "nodejs", "node"],
    ["react.js", "reactjs", "react"],
    ["postgresql", "postgres"],
    ["object-oriented design", "oop", "object oriented programming"],
    ["quality assurance", "qa"],
    ["software development life cycle", "sdlc"],
    ["proof of concept", "poc"],
    ["site reliability engineering", "sre"],
    ["service level agreement", "sla"],
    ["business intelligence", "bi"],
    ["extract transform load", "etl"],
    ["application development", "app development"],
    ["go-to-market", "gtm", "go to market"],
    ["return on investment", "roi"],
    ["search engine marketing", "sem"],
    ["content management system", "cms"],
    ["minimum viable product", "mvp"],
    ["large language model", "llm", "large language models", "llms"],
]


def build_synonym_lookup() -> dict[str, set[str]]:
    """Maps every term to the full set of terms in its cluster (including itself)."""
    lookup: dict[str, set[str]] = {}
    for cluster in SYNONYM_CLUSTERS:
        cluster_set = set(cluster)
        for term in cluster:
            lookup[term] = cluster_set
    return lookup


SYNONYM_LOOKUP = build_synonym_lookup()
