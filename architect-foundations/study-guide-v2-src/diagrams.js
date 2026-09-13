/* Interactive diagram specs for the v2 visual map.
   Each diagram: rows of nodes; every node carries a detail body shown in the context rail.
   tone: ink | d1..d5 | good | bad | plain     kind: flow (arrows between nodes) | stack | grid
   seq: optional ordered node ids for step-through playback. */
window.DIAGRAMS = [
{
  id:"request", t:"Anatomy of a Messages API request",
  tags:["system","tools","tool_choice","messages","request","json","stateless","top-level","input_schema","usage","stop_reason"],
  lead:"Everything you send lives in one JSON body. The exam leans on knowing which knob lives where — <b>system</b> is its own top-level field (not a message), <b>tools</b> and <b>tool_choice</b> are top-level, and <b>messages</b> is a strictly alternating array you resend in full every turn.",
  rows:[
    {label:"POST /v1/messages — one self-contained body, every turn", kind:"grid", nodes:[
      {id:"model", t:"model", s:'"claude-…"', tone:"plain", d:"Which model serves the request. Not where behaviour rules go."},
      {id:"max_tokens", t:"max_tokens", s:"output cap for this response", tone:"plain", d:"Caps the <i>output</i> only. A truncated answer shows up as <code>stop_reason: \"max_tokens\"</code> — not an error, and not a context-window problem."},
      {id:"system", t:"system", s:"top-level string — NOT a message", tone:"d1", d:"Role, rules, escalation criteria, few-shot guidance. It is a <b>top-level field</b>, not an entry in <code>messages[]</code>. Constant across turns, so it is the cheapest place to put stable instructions — and the wrong place to put anything that must hold deterministically."},
      {id:"tools", t:"tools[ ]", s:"name · description · input_schema", tone:"d2", d:"<b>description</b> drives selection — it is the primary mechanism the model uses to tell two similar tools apart. <b>input_schema</b> enforces the shape of the arguments. Every tool's definition sits in context on every turn, called or not."},
      {id:"tool_choice", t:"tool_choice", s:'auto | any | {type:"tool",name}', tone:"d4", d:"The invocation guarantee. <code>auto</code> lets the model answer in text — never leave it there if structure is required. See the <i>Structured output</i> diagram for the full matrix. It does not control ordering."},
      {id:"messages", t:"messages[ ]", s:"the entire conversation, resent every turn", tone:"d5", d:"Strictly alternating user / assistant. The API is stateless: turn 4 only works because turns 1–3 are in the array you just sent."}
    ]},
    {label:"messages[ ] expanded", kind:"stack", nodes:[
      {id:"m1", t:'role: "user"', s:'content: [ {type:"text", text:"refund order 4471"} ]', tone:"plain", d:"Plain text user turn."},
      {id:"m2", t:'role: "assistant"', s:'content: [ {type:"text"…}, {type:"tool_use", id:"tu_1", name:"lookup_order", input:{…}} ]', tone:"d2", d:"A turn can hold text <i>and</i> tool_use blocks. Structured data you asked for via tool use is read from <code>tool_use.input</code>."},
      {id:"m3", t:'role: "user"  ← you send the tool result back', s:'content: [ {type:"tool_result", tool_use_id:"tu_1", content:"…", is_error:false} ]', tone:"d1", d:"<b>tool_result goes in a USER turn and must match tool_use_id.</b> This trips people up: the result of your own code comes back to Claude wearing the user role."},
      {id:"m4", t:'role: "assistant"', s:'content: [ {type:"text", text:"Refund issued…"} ]', tone:"d2", d:"Final text once the model has what it needs."}
    ]},
    {label:"Response envelope — what you read back", kind:"grid", nodes:[
      {id:"content", t:"content[ ]", s:"text blocks · tool_use blocks", tone:"plain", d:"Read structured data from <code>tool_use.input</code>, not by parsing prose."},
      {id:"stop", t:"stop_reason", s:'"tool_use" → run tools, loop again', tone:"d1", d:'<code>"tool_use"</code> → execute and loop. <code>"end_turn"</code> → done. <code>"max_tokens"</code> → you truncated it. This field is the control signal for the whole agentic loop.'},
      {id:"usage", t:"usage", s:"input_tokens / output_tokens", tone:"plain", d:"Every turn re-bills the whole history — which is why cost grows superlinearly across a long session."}
    ]}
  ]
},
{
  id:"loop", t:"The agentic loop — driven by stop_reason",
  tags:["loop","stop_reason","end_turn","tool_use","iteration cap","keyword","termination","escalate"],
  lead:"The single most reliable control signal in the exam. Loop while <code>stop_reason === \"tool_use\"</code>; stop on <code>\"end_turn\"</code>. Keyword scans, iteration caps as the primary stop, and 'no tool call present' checks are all named anti-patterns.",
  seq:["build","call","check","exec","append"],
  rows:[
    {label:"The turn", kind:"flow", nodes:[
      {id:"build", t:"build request", s:"system + tools + history", tone:"plain", d:"Every turn re-sends the full state: system prompt, tool definitions, and the entire messages array."},
      {id:"call", t:"call the API", s:"messages.create()", tone:"d2", d:"One synchronous call. Nothing about the loop is server-side — you own it."},
      {id:"check", t:"stop_reason?", s:"read the field, not the text", tone:"d1", shape:"decision", d:"The branch point. <code>tool_use</code> → execute tools and continue. <code>end_turn</code> → return the final response, hand off, or escalate."},
      {id:"exec", t:"execute requested tool(s)", s:"hooks fire here — pre and post", tone:"plain", d:"Your code runs the tool. This boundary is exactly where PreToolUse and PostToolUse hooks bite — see the <i>Hook lifecycle</i> diagram."},
      {id:"append", t:"append tool_result", s:"to messages[ ] as a user turn", tone:"plain", d:"Append the result with the matching <code>tool_use_id</code>, then loop back to build the next request."},
      {id:"done", t:"return final response", s:"or hand off / escalate", tone:"good", d:"On <code>end_turn</code>. Every termination path must land in a completed resolution or a human handoff carrying full context."}
    ]},
    {label:"The two lists the exam grades you on", kind:"grid", nodes:[
      {id:"anti", t:"✗ Anti-patterns (exam distractors)", s:"scanning text for \"done\" / \"resolved\" / \"complete\" · iteration cap as the PRIMARY stopping mechanism · \"no tool call in this turn, so it must be finished\"", tone:"bad", d:"All three substitute a guess for a field that already tells you the answer. Keyword scanning is the same failure mode as deciding retry policy by reading an error message."},
      {id:"safe", t:"✓ Safeguards that ARE correct", s:"a cap as a runaway backstop that escalates, never as the stop · every termination path ends in resolution OR human escalation · structured handoff package on exit", tone:"good", d:"A cap is legitimate as a backstop — the distinction is whether it is the <i>primary</i> stopping mechanism (wrong) or a runaway guard that escalates (right)."}
    ]}
  ]
},
{
  id:"stateless", t:"Statelessness — why history is resent every turn",
  tags:["stateless","history","context","cost","lost in the middle","case facts","trim"],
  lead:"The API keeps nothing between calls. Turn 4 works only because turns 1–3 are in the array you just sent. This is why context management is a real engineering problem, and why cost grows superlinearly across a long session.",
  rows:[
    {label:"Each request carries everything before it", kind:"flow", nodes:[
      {id:"r1", t:"request 1", s:"U1", tone:"d5", d:"One user turn."},
      {id:"r2", t:"request 2", s:"U1 · A1  +  U2", tone:"d5", d:"You resend turn 1 in full and append the new user message."},
      {id:"r3", t:"request 3", s:"U1 · A1 · U2 · A2 (tool_use)  +  tool_result", tone:"d1", d:"The tool result becomes part of the permanent history — and tool results are the biggest source of silent growth."},
      {id:"r4", t:"request 4", s:"U1 · A1 · U2 · A2 · tool_result · A3  +  U4", tone:"d4", d:"Four turns in, you are paying input tokens on everything that came before, every single turn."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"bad", t:"What goes wrong as this grows", s:"40-field tool results accumulate · exact values get summarized away · \"lost in the middle\" — findings buried mid-input get dropped", tone:"bad", d:"Degradation shows up as the agent citing 'typical patterns' instead of the specific values it was given, or re-asking for an order number it already has."},
      {id:"good", t:"What you do about it", s:"persistent \"case facts\" block (verbatim, never summarized) · trim tool output to relevant fields · key findings first, headers throughout", tone:"good", d:"Separate content by durability rather than reaching for a bigger window — the next diagram is that layering."}
    ]}
  ]
},
{
  id:"layers", t:"Context layers — what gets summarized and what never does",
  tags:["context","summarize","case facts","scratchpad","compact","bigger context window","tool results"],
  lead:"The fix for long sessions is not a bigger window; it is separating content by durability. Exact transactional values live in a layer that summarization never touches.",
  rows:[
    {label:"Every prompt = fixed layers + a compressible layer", kind:"stack", nodes:[
      {id:"sys", t:"system prompt", s:"role · escalation criteria · few-shot examples — constant", tone:"d1", d:"Stable across the session. Cheap, because it never grows."},
      {id:"facts", t:"★ case facts block — NEVER summarized", s:"order #4471 · $847.32 · shipped 3/14 · RMA approved · tier: gold", tone:"good", d:"Structured, verbatim, re-emitted in full every turn. This is the layer that protects exact transactional values from being paraphrased into uselessness."},
      {id:"hist", t:"conversation history — safe to summarize", s:"narrative only; the numbers already live above", tone:"d2", d:"Progressive summarization is fine here <i>and only here</i> — because the numbers are preserved in the case-facts layer."},
      {id:"tools", t:"tool results — trim before they land", s:"keep 5 relevant fields, not the 40 the API returned", tone:"plain", d:"The single biggest source of silent context growth. Trim at the boundary, before the result enters history — a PostToolUse hook is the natural place."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"outside", t:"Outside the context window", s:"scratchpad file — durable findings the agent re-reads later · state export + coordinator manifest for crash recovery", tone:"d4", d:"External persistence survives context boundaries, which is the whole point: findings outlive the window they were discovered in, and a crash resumes without repeating work."},
      {id:"distract", t:"Distractors", s:"✗ \"use a bigger context window\" · ✗ \"ask the agent to summarize in-conversation\" · ✗ \"keep the full transcript, never summarize\" · ✗ \"restart the session and be more concise\"", tone:"bad", d:"All four appear routinely as the plausible wrong answer. None of them separate content by durability."}
    ]}
  ]
},
{
  id:"session", t:"Session state — resume, fork, or start fresh", added:"9/12",
  tags:["resume","fork","fork_session","session","stale","baseline","--resume","branch"],
  lead:"Three different moves, chosen by how much of the prior state is still true. <b>Resume</b> = one timeline continuing · <b>fork</b> = one timeline splitting from a shared baseline · <b>fresh + summary</b> = a new timeline seeded with distilled knowledge.",
  rows:[
    {label:"Prior session: 40 files analyzed, dependencies mapped — then you stop, time passes, files may have moved", kind:"stack", nodes:[
      {id:"resume", t:"RESUME — one timeline continuing", s:"--resume <session-name>  ·  detect changes in CODE → inject the change list → re-read only those 6", tone:"good", d:"Prior history, tool results and conclusions all come back. The work you add is detecting what actually changed and injecting that list — the agent cannot know on its own which files moved."},
      {id:"fork", t:"FORK — one timeline splitting from a shared baseline", s:"fork_session  ·  branch A: nested modules · integration tests  |  branch B: flat + workspaces · unit tests", tone:"d4", d:"The expensive analysis happens once; branches never see each other. That isolation is the point — two approaches in ONE session means the second anchors on the first."},
      {id:"fresh", t:"FRESH + INJECTED SUMMARY — a new timeline, seeded", s:"structured summary YOU wrote → clean session, no stale tool results", tone:"d2", d:"For when the prior context is actively <i>misleading</i>, not merely old. You write the summary; you do not ask the agent to salvage its own stale conclusions."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"order", t:"Choose in this order", s:"1 · prior context mostly WRONG now → fresh + injected summary   2 · mostly right, a few files moved → resume + targeted re-analysis   3 · need two divergent explorations → fork at the shared baseline", tone:"plain", d:"The question always tells you how much of the old state still holds. Answer that first and the mechanism is forced."},
      {id:"wrong", t:"What makes it wrong", s:"✗ re-analyze all 40 when 6 changed · ✗ resume and trust stale conclusions · ✗ \"ask the agent to re-read whatever it thinks changed\" · ✗ both approaches in ONE session", tone:"bad", d:"The last one is the subtlest: a single session exploring two strategies contaminates the second with the first."}
    ]}
  ]
},
{
  id:"coordinator", t:"Coordinator ↔ subagent — isolation and the handoff package",
  tags:["coordinator","subagent","Task","allowedTools","least privilege","decomposition","handoff","hub"],
  lead:"Hub-and-spoke: the coordinator owns all routing, aggregation, and error handling. Subagents do <b>not</b> inherit conversation history — whatever they need must be injected. What comes back should be structured data, not verbose reasoning.",
  rows:[
    {label:"The hub", kind:"stack", nodes:[
      {id:"coord", t:"Coordinator", s:"decompose · delegate · aggregate — needs \"Task\" in allowedTools to spawn", tone:"d1", d:"Owns decomposition breadth. If subagents each succeed but coverage is incomplete, the fault is here, not downstream. Parallel work = multiple Task calls in a single coordinator response."}
    ]},
    {label:"Spokes — tools scoped to role only (least privilege)", kind:"grid", nodes:[
      {id:"search", t:"search", s:"web tools only · isolated context", tone:"d2", d:"Executes its assigned query. Correctly performing an incomplete assignment is not a searcher bug."},
      {id:"analyze", t:"analyze", s:"doc tools only · isolated context", tone:"d2", d:"Separates content from metadata (source URLs, dates) so attribution survives."},
      {id:"synth", t:"synthesize", s:"no web tools · least privilege", tone:"d2", d:"Gets a narrow <code>verify_fact</code> tool for the high-frequency simple case; rare deep investigations still route through the coordinator."},
      {id:"report", t:"report", s:"formatting only · isolated context", tone:"d2", d:"Subagents never talk to each other — all routing goes through the hub."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"down", t:"↓ Injected into a subagent (context passing)", s:"the specific assignment and its scope boundary · summarized findings from the prior phase · only the tools its role needs", tone:"plain", d:"They inherit nothing. Anything unstated is unavailable — which is why narrow decomposition silently drops coverage."},
      {id:"up", t:"↑ Returned (structured handoff package)", s:"claim → source mappings (URL, doc, excerpt) + collection dates · conflicts annotated, not silently resolved · accumulated context, findings, authorization state — not prose", tone:"good", d:"Structured data, so the coordinator can aggregate, detect gaps, and re-delegate. Conflicting values get annotated with attribution and dates rather than quietly picked."}
    ]}
  ]
},
{
  id:"hooks", t:"Hook lifecycle — where enforcement actually happens",
  tags:["hook","PreToolUse","PostToolUse","Stop hook","enforce","format","lint","block","permissions"],
  lead:"Hooks sit on the tool-execution boundary inside the loop. Timing is the whole exam question: PreToolUse can block, PostToolUse sees the result, Stop runs once at the end.",
  seq:["req","pre","exec","post","sees"],
  rows:[
    {label:"The tool-execution boundary", kind:"flow", nodes:[
      {id:"req", t:"model requests", s:"a tool call appears in the response", tone:"plain", d:"The model has asked for a tool. Nothing has happened yet."},
      {id:"pre", t:"PreToolUse", s:"can BLOCK the call — refund > $500 → escalate", tone:"d4", d:"Runs <b>before the action exists</b>. Blocks policy-violating calls and redirects; implements prerequisite gates (no <code>lookup_order</code> until <code>get_customer</code> verified).<br><br><b>✗ Wrong place to format an edited file</b> — the edit hasn't happened, so it inspects stale content."},
      {id:"exec", t:"tool executes", s:"your code runs", tone:"plain", d:"The side effect lands here."},
      {id:"post", t:"PostToolUse", s:"sees + transforms the result — format/lint the changed file", tone:"d2", d:"Runs <b>after it succeeded</b>. Normalizes heterogeneous data (Unix ts / ISO 8601 / status codes); match <code>Edit|Write|MultiEdit</code> → format, lint, type-check that file using the path from the hook payload.<br><br><b>✗ Printing to stdout only</b> is a log, not enforcement — exit blocking and write the diagnostic to stderr so it feeds back to the model."},
      {id:"sees", t:"model sees", s:"the (possibly transformed) result", tone:"plain", d:"Whatever PostToolUse left behind is what enters context."}
    ]},
    {label:"Cost rule — match hook expense to hook frequency", kind:"grid", nodes:[
      {id:"cheap", t:"per-edit hooks must be cheap", s:"prettier · eslint · tsc on ONE file  (seconds)", tone:"good", d:"File-scoped, using the changed path from the payload."},
      {id:"exp", t:"Stop hook for expensive verification", s:"full test suite, once per session  (minutes)", tone:"d1", d:"Cost × frequency is the test. Raising the timeout permits the slowness; it does not fix the cadence."}
    ]}
  ]
},
{
  id:"config", t:"Claude Code configuration — which mechanism, and when it loads",
  tags:["CLAUDE.md",".claude",".mcp.json","rules","skills","commands","scope","permissions","glob","project","user"],
  lead:"Two axes decide every configuration question: <b>who should get it</b> (user vs project scope) and <b>when it should apply</b> (always / by path / on demand / deterministically). Get both right and the answer is forced.",
  rows:[
    {label:"Axis 1 — scope: who receives it", kind:"grid", nodes:[
      {id:"proj", t:"PROJECT — committed, everyone gets it on clone", s:".mcp.json · .claude/commands/ · .claude/skills/ · .claude/rules/ · project settings (permissions, hooks) · CLAUDE.md at repo root or .claude/CLAUDE.md", tone:"good", d:"Secrets stay out via <code>${ENV_VAR}</code> expansion inside the committed config — shared definition, per-developer credential."},
      {id:"user", t:"USER — personal, never propagates", s:"~/.claude.json · ~/.claude/commands/ · ~/.claude/skills/ · ~/.claude/CLAUDE.md", tone:"d4", d:"\"Works for me, missing for my teammate\" lives here. Verify with <code>/memory</code> and check whether the file is actually committed."}
    ]},
    {label:"Axis 2 — when it applies (and how hard it bites)", kind:"grid", nodes:[
      {id:"always", t:"ALWAYS", s:"CLAUDE.md · universal standards · probabilistic", tone:"d3", d:"The only bucket that needs judgment — \"prefer\", \"where reasonable\", \"consider\". Emphasis and ALL CAPS never change the enforcement class."},
      {id:"path", t:"BY PATH", s:'.claude/rules/ + paths glob ["terraform/**/*"] · probabilistic', tone:"d2", d:"For conventions that span directories by file type — test files scattered beside the code they test. A subdirectory CLAUDE.md can't cover that cleanly."},
      {id:"demand", t:"ON DEMAND", s:"skills · slash commands · context:fork · allowed-tools · invoked, not ambient", tone:"d4", d:"Needs invocation, or Claude choosing to load it — which is why a skill is the wrong answer to \"apply automatically by file path\"."},
      {id:"det", t:"DETERMINISTIC", s:"permissions deny rules · Pre/PostToolUse hooks · guaranteed", tone:"good", d:"The only bucket with a guarantee. Everything with consequences belongs here."}
    ]},
    {label:"Sorting test — read the instruction and ask:", kind:"stack", nodes:[
      {id:"t1", t:'"Never do X" / "must never happen"', s:"→ settings permissions deny", tone:"plain", d:"Hard prohibition, evaluated before the tool runs: deny writes to /infra/production/, deny reads of *.env, deny destructive git."},
      {id:"t2", t:'"Always do Y after every edit/command"', s:"→ hook (Post for after, Pre for gating)", tone:"plain", d:"A mandatory action tied to a tool event."},
      {id:"t3", t:'"Prefer / where reasonable / consider"', s:"→ CLAUDE.md", tone:"plain", d:"Judgment-laden guidance the model should weigh."}
    ]}
  ]
},
{
  id:"structured", t:"Structured output — the reliability ladder and tool_choice matrix",
  tags:["structured output","schema","tool_choice","prefill","json","semantic","ordering","extract"],
  lead:"Two separate decisions that get conflated: <i>how</i> you request structure (the ladder) and <i>whether a tool is guaranteed to run</i> (tool_choice). Neither one buys you semantic correctness.",
  rows:[
    {label:"Reliability ladder — pick by how strict the downstream requirement is", kind:"stack", nodes:[
      {id:"l1", t:"1 · tool use + JSON schema  ← most reliable", s:"API builds args to fit the schema — no syntax errors, no preamble", tone:"good", d:"Eliminates malformed output by construction. Correct whenever anything downstream hard-fails on bad shape."},
      {id:"l2", t:"2 · prefilled assistant response", s:"suppresses preamble · enforces nothing about shape", tone:"d2", d:"Middle tier. Stops the chatty lead-in; makes no promise about structure."},
      {id:"l3", t:'3 · "respond with only JSON" in the prompt', s:"best effort · the 2% that breaks your pipeline", tone:"bad", d:"Fine for exploration, never for a pipeline."}
    ]},
    {label:"tool_choice matrix", kind:"stack", nodes:[
      {id:"auto", t:'"auto"  (default)', s:"model MAY answer in text → pipelines reading tool_use crash", tone:"bad", d:"The default, and the trap. If a tool must run, auto is never the answer."},
      {id:"any", t:'"any"', s:"must call SOME tool → several schemas, unknown document type", tone:"good", d:"Guarantees a tool call when you don't know in advance which schema applies."},
      {id:"named", t:'{"type":"tool","name":"extract_metadata"}', s:"must call THAT tool → schema known in advance", tone:"good", d:"Forces the specific tool. Use when the document type is known."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"order", t:"Ordering is NOT a tool_choice feature", s:"force step 1 → read its result → make call 2 with it   ✗ array order · ✗ \"described in the tool description\"", tone:"d1", d:"Sequence prerequisites live in your own control flow — or, when violation has consequences, in a PreToolUse gate."},
      {id:"sem", t:"Schema validity ≠ correctness", s:"line items not summing · value in the wrong field · invented dates — all pass a strict schema", tone:"bad", d:"Strict JSON stops syntax errors, not semantic ones. Add cross-field validation."},
      {id:"selfval", t:"Self-validating schema fields to add", s:"calculated_total + stated_total · conflict_detected (bool + description) · per-field confidence · detected_pattern · nullable fields + \"unclear\" / \"other\" + detail", tone:"good", d:"Each one turns a silent semantic error into something your code can branch on."}
    ]}
  ]
},
{
  id:"extraction", t:"Extraction pipeline — validation, retry, and human routing",
  tags:["extraction","retry","validation","human review","nullable","confidence","sample","absent"],
  lead:"One flow that ties together four weak objectives: schema design, tool_choice, the retry boundary, and review routing. The critical branch is whether the information exists in the source at all.",
  seq:["doc","extract","validate","branch"],
  rows:[
    {label:"The happy path", kind:"flow", nodes:[
      {id:"doc", t:"document in", s:"unknown layout", tone:"plain", d:"Varied layouts are the norm — 2–4 few-shot examples across layouts is what generalizes."},
      {id:"extract", t:"extract via tool use", s:'nullable fields · enums with "unclear" · tool_choice: "any" · normalization rules', tone:"d2", d:"Nullable fields prevent fabrication; <code>\"any\"</code> guarantees a tool call when the document type is unknown; normalization rules go in the prompt alongside the strict schema."},
      {id:"validate", t:"validate in code", s:"calculated vs stated total · conflict_detected · field confidence", tone:"plain", d:"Cross-field checks catch the semantic errors a schema cannot."},
      {id:"ok", t:"valid → downstream", s:"plus sampled QA", tone:"good", d:"Even clean output gets a stratified random sample pulled for review."}
    ]},
    {label:"The branch that decides everything", kind:"flow", nodes:[
      {id:"branch", t:"is the information in the document?", s:"the retry boundary", tone:"d1", shape:"decision", d:"Everything hinges here. Format and structure errors are recoverable; absent information never is."},
      {id:"yes", t:"yes — format / structure error", s:"retry with error feedback: original document + failed extraction + the SPECIFIC validation error", tone:"good", d:"Generic \"try again\" wastes the attempt. The specific error is what makes the retry converge."},
      {id:"no", t:"no — absent", s:"route to human — do NOT retry", tone:"bad", d:"Retries never conjure missing information. And if this happens often, the schema should have allowed null in the first place."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"route", t:"Human review routing — spend capacity where errors are", s:"1. low calibrated field-level confidence (labeled validation set)   2. ambiguous / internally contradictory documents   3. + stratified random sample of HIGH-confidence output", tone:"plain", d:"(3) is what catches error patterns you didn't know existed — and why 97% overall accuracy can hide 70% on one document type."},
      {id:"fb", t:"Feedback loop back into the prompt", s:"detected_pattern on every finding → join to accept/dismiss → which construct dominates dismissals? → fix that prompt rule / schema field / few-shot example", tone:"d4", d:"Aggregate dismissal rate alone tells you nothing actionable. Free-text reviewer notes are sparse and unaggregatable."}
    ]}
  ]
},
{
  id:"batch", t:"Sync vs Batch — decide by blocking, then do the SLA math",
  tags:["batch","Message Batches","sync","custom_id","SLA","cost","latency","overnight"],
  lead:"Volume and cost are not the deciding factor; whether anything waits on the result is. Then size your submission interval against the 24-hour window.",
  rows:[
    {label:"", kind:"grid", nodes:[
      {id:"sync", t:"Synchronous Messages API", s:"✓ a human or pipeline stage waits on the result · ✓ pre-merge review · interactive extraction · live agent · ✓ multi-turn tool calling within the request", tone:"good", d:"Full price, immediate response. <b>The batch disqualifier:</b> if you need tools mid-request, it must be sync regardless of latency tolerance."},
      {id:"batchapi", t:"Message Batches API", s:"✓ nothing blocks — overnight reports, weekly audits · ✓ ~50% cost savings · ✓ up to 24h window, NO latency SLA", tone:"d4", d:"<code>custom_id</code> correlates request ↔ response. ✗ No multi-turn tool calling inside one request."}
    ]},
    {label:"SLA arithmetic — worst case for a document that just missed a submission", kind:"flow", nodes:[
      {id:"q", t:"queue wait", s:"= your submission interval", tone:"plain", d:"A document arriving right after a submission waits a full interval before it even enters a batch."},
      {id:"p", t:"+ processing window", s:"up to 24 hours", tone:"plain", d:"No SLA inside the window — you must plan for the full 24h."},
      {id:"c", t:"≤ your commitment", s:"30h commitment → submit every 6h", tone:"good", d:"interval + 24h ≤ commitment. That inequality is the whole calculation."}
    ]},
    {label:"Failure handling", kind:"stack", nodes:[
      {id:"fail", t:"group failures by cause", s:"context-limit: chunk the document · validation: retry with the specific error", tone:"plain", d:"Different causes need different fixes; one blanket retry serves neither."},
      {id:"resub", t:"resubmit ONLY those custom_ids", s:"never the whole batch, never an unchanged retry", tone:"good", d:"This is what <code>custom_id</code> is for."}
    ]}
  ]
},
{
  id:"decomp", t:"Decomposition & review architecture — fixed chain vs adaptive",
  tags:["decomposition","prompt chain","dynamic","review","self-review","attention dilution","consensus"],
  lead:"Two shapes, one test: could you write the full subtask list before starting and still be right? Also shown — why the reviewer must be a fresh instance and why big reviews split.",
  rows:[
    {label:"Fixed prompt chain — steps knowable up front, uniform per item", kind:"flow", nodes:[
      {id:"f1", t:"file 1 pass", s:"local issues", tone:"d2", d:"Same steps for every item."},
      {id:"f2", t:"file 2 pass", s:"local issues", tone:"d2", d:"Uniform treatment per file keeps depth consistent."},
      {id:"fn", t:"file N pass", s:"local issues", tone:"d2", d:"Splitting per file is what defeats attention dilution."},
      {id:"fi", t:"cross-file integration pass", s:"data-flow issues across files", tone:"good", d:"A separate pass for what no single-file pass can see."}
    ]},
    {label:"Dynamic decomposition — each step's findings generate the next subtasks", kind:"flow", nodes:[
      {id:"d1", t:"map structure", s:"+ dependencies", tone:"d1", d:"You cannot write the subtask list up front, so you discover it."},
      {id:"d2", t:"identify high-impact areas", s:"from what was found", tone:"d1", d:"Step 2 exists only because of step 1's output."},
      {id:"d3", t:"prioritized plan", s:"adapts as deps surface", tone:"d1", d:"The plan is an artifact of discovery, not a precondition."},
      {id:"d4", t:"execute + replan", s:"loop back on discovery", tone:"d1", d:"Loops back to mapping as new dependencies appear."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"fitfixed", t:"Fixed chain fits", s:"\"review this 14-file PR for correctness, security, performance\" · same steps for every item · aspects known before you start", tone:"plain", d:"Split per-file + integration to avoid attention dilution."},
      {id:"fitdyn", t:"Dynamic fits", s:"\"add comprehensive tests to this legacy codebase\" · \"why did checkout latency regress?\" · \"who still uses lib X?\"", tone:"plain", d:"Step 2 depends on what step 1 discovered."},
      {id:"rev", t:"Review architecture — the generator cannot grade itself", s:"✓ fresh independent instance · ✓ confidence per finding for calibrated routing · ✓ per-file passes + integration pass   ✗ \"double-check its own work\" · ✗ \"bigger context window so all 14 files fit\" · ✗ \"only flag issues appearing in ≥2 of 3 runs\"", tone:"bad", d:"Consensus voting suppresses real bugs caught intermittently. A model retains its generation reasoning and is less likely to question its own work."}
    ]}
  ]
},
{
  id:"escalation", t:"Escalation & termination — every path must land somewhere",
  tags:["escalation","handoff","termination","sentiment","confidence","human","policy gap"],
  lead:"The orchestration-layer safeguard the exam keeps returning to: no matter how the loop ends — resolution, error, cap, timeout — the session terminates in a completed resolution or a human handoff carrying full context.",
  seq:["start","ask1","ask2"],
  rows:[
    {label:"The decision tree", kind:"flow", nodes:[
      {id:"start", t:"agent session in progress", s:"", tone:"plain", d:"Any point in the loop."},
      {id:"ask1", t:"did the human explicitly ask for a person?", s:"", tone:"d1", shape:"decision", d:"If yes → <b>escalate NOW</b>, do not investigate first. An explicit request is honored immediately; that's the exception that beats 'try to resolve first'."},
      {id:"ask2", t:"policy gap, or no progress with available tools?", s:"", tone:"d1", shape:"decision", d:"If no → resolve autonomously: acknowledge the frustration, then offer resolution, escalating only if the request is reiterated. If yes → escalate with the full package."},
      {id:"esc", t:"escalate with package", s:"context + findings + auth state", tone:"bad", d:"Never a bare handoff — the human must not restart from zero."}
    ]},
    {label:"", kind:"grid", nodes:[
      {id:"pkg", t:"The handoff package — what must survive", s:"• accumulated context and the case-facts block · • findings so far, with sources and what was already tried · • authorization state — what's approved, what's pending", tone:"plain", d:"Structured, not prose. Same principle as a subagent's return package."},
      {id:"nots", t:"Not escalation triggers", s:"✗ negative sentiment — uncorrelated with complexity · ✗ self-reported confidence below a threshold — uncalibrated · ✗ every frustrated-but-solvable case", tone:"bad", d:"Both sentiment and self-reported confidence are unreliable proxies for case complexity — they appear as distractors repeatedly."}
    ]}
  ]
}
];
