import sys
import json
from langgraph.types import Command
from graph import app
from state import WorkflowStatus
import config

# ANSI Colors for premium console experience
BLUE = "\033[94m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_banner(text: str):
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN} {text} {RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}\n")

def print_state_summary(state_val: dict):
    print(f"\n{BOLD}--- Current Graph State Summary ---{RESET}")
    print(f"{BOLD}Status:{RESET} {state_val.get('status')}")
    print(f"{BOLD}Provider:{RESET} {state_val.get('provider')}")
    print(f"{BOLD}PRD:{RESET} {state_val.get('prd')[:100]}...")
    if state_val.get("clarification_responses"):
        print(f"{BOLD}Clarifications:{RESET} {json.dumps(state_val.get('clarification_responses'), indent=2)}")
    if state_val.get("approved") is not None:
        print(f"{BOLD}Approved:{RESET} {state_val.get('approved')}")
    if state_val.get("project_model"):
        print(f"{BOLD}Project Model:{RESET} {state_val.get('project_model')}")
    if state_val.get("intervention_log"):
        print(f"{BOLD}Intervention Log:{RESET} {state_val.get('intervention_log')}")
    print(f"{BOLD}{'-'*35}{RESET}\n")

def main():
    print_banner("Archon Workflow Intelligence Test Harness")
    
    # 1. Check API Keys
    errors = config.check_keys()
    if errors:
        print(f"{RED}{BOLD}Configuration Warnings:{RESET}")
        for err in errors:
            print(f" - {err}")
        print()
    
    # 2. Select Provider
    provider_input = input(f"Select LLM Provider ({BOLD}openai{RESET} / {BOLD}gemini{RESET}) [default: {config.DEFAULT_PROVIDER}]: ").strip().lower()
    provider = provider_input if provider_input in ["openai", "gemini"] else config.DEFAULT_PROVIDER
    
    # 3. Enter PRD
    print(f"\n{BOLD}Enter your Product Requirements (PRD):{RESET}")
    print("(Press Enter on an empty line to finish writing)")
    prd_lines = []
    while True:
        try:
            line = input()
            if line == "":
                break
            prd_lines.append(line)
        except KeyboardInterrupt:
            sys.exit(0)
    
    prd = "\n".join(prd_lines).strip()
    if not prd:
        prd = "Users can make payments"  # Default test PRD
        print(f"{YELLOW}No input entered. Using default PRD: '{prd}'{RESET}")
        
    # 4. Optional start in Intervention Mode
    start_intervention = input(f"\nStart workflow in {BOLD}Intervention Mode{RESET} immediately? (y/n) [default: n]: ").strip().lower()
    intervention_init = start_intervention in ["y", "yes"]
    
    # Setup graph config
    thread_id = "thread-archon-test"
    config_dict = {"configurable": {"thread_id": thread_id}}
    
    # Initialize the graph
    initial_state = {
        "prd": prd,
        "provider": provider,
        "validation_status": "pending",
        "validation_findings": None,
        "validation_questions": [],
        "clarification_responses": {},
        "clarifications": None,
        "requirements_doc": None,
        "approved": None,
        "approval_feedback": None,
        "intervention_requested": intervention_init,
        "intervention_log": [],
        "status": WorkflowStatus.VALIDATING,
        "project_model": None,
        "cpm_approved": None,
        "cpm_feedback": None,
        "architecture_model": None,
        "architecture_feedback": None,
        "architecture_approved": None,
        "database_model": None,
        "database_feedback": None,
        "database_approved": None
    }
    
    print(f"\n{BLUE}Initializing state and starting graph execution...{RESET}")
    
    # Start graph stream
    try:
        events = app.stream(initial_state, config_dict, stream_mode="values")
        for event in events:
            # We just consume events, the state is saved in checkpointer
            pass
    except Exception as e:
        print(f"{RED}Error starting graph: {e}{RESET}")
        return

    # Loop to handle interrupts and continue execution
    while True:
        state_info = app.get_state(config_dict)
        
        # If there are no next steps, the graph is done
        if not state_info.next:
            print_banner("Workflow Finished Successfully!")
            final_state = state_info.values
            print(f"{GREEN}{BOLD}Final Generated Requirements:{RESET}\n")
            print(final_state.get("requirements_doc"))
            break
            
        tasks = state_info.tasks
        interrupts = tasks[0].interrupts if tasks else []
        
        if interrupts:
            interrupt_data = interrupts[0].value
            interrupt_type = interrupt_data.get("type")
            
            if interrupt_type == "clarification":
                print_banner("HITL: Clarification Mode Required")
                print(f"{YELLOW}Justification:{RESET} {interrupt_data.get('justification')}\n")
                print(f"{BOLD}The agent requires answers to the following questions:{RESET}")
                
                questions = interrupt_data.get("questions", [])
                answers = {}
                intervene_flag = False
                
                for i, q in enumerate(questions, 1):
                    print(f"\n{CYAN}{BOLD}Q{i}:{RESET} {q}")
                    ans = input(f"{BLUE}A{i} (or type 'intervention'): {RESET}").strip()
                    
                    if ans.lower() == "intervention":
                        intervene_flag = True
                        break
                    answers[q] = ans
                
                if intervene_flag:
                    print(f"\n{YELLOW}Transitioning to Intervention Mode...{RESET}")
                    events = app.stream(Command(resume={"__intervention__": True}), config_dict, stream_mode="values")
                else:
                    print(f"\n{GREEN}Submitting answers and resuming workflow...{RESET}")
                    events = app.stream(Command(resume=answers), config_dict, stream_mode="values")
                    
                for event in events:
                    pass
                    
            elif interrupt_type == "cpm_approval":
                print_banner("HITL: CPM Approval Mode Required")
                print(f"{BOLD}Generated Canonical Project Model (CPM):{RESET}")
                print(f"{BLUE}{'='*40}{RESET}")
                import json
                print(json.dumps(interrupt_data.get("project_model"), indent=2))
                print(f"{BLUE}{'='*40}{RESET}\n")
                
                print(f"{BOLD}Options:{RESET}")
                print(f" - Type {GREEN}'approve'{RESET} to finalize the CPM.")
                print(f" - Type {YELLOW}'intervention'{RESET} to modify graph state variables.")
                print(f" - Or type any {RED}feedback / changes{RESET} to request a CPM revision.\n")
                
                choice = input(f"{BLUE}Enter choice: {RESET}").strip()
                
                if choice.lower() == "intervention":
                    print(f"\n{YELLOW}Transitioning to Intervention Mode...{RESET}")
                    events = app.stream(Command(resume={"__intervention__": True}), config_dict, stream_mode="values")
                else:
                    events = app.stream(Command(resume=choice), config_dict, stream_mode="values")
                    
                for event in events:
                    pass
                    
            elif interrupt_type == "architecture_approval":
                print_banner("HITL: Architecture Approval Mode Required")
                print(f"{BOLD}Generated Architecture Model:{RESET}")
                print(f"{BLUE}{'='*40}{RESET}")
                import json
                print(json.dumps(interrupt_data.get("architecture_model"), indent=2))
                print(f"{BLUE}{'='*40}{RESET}\n")
                
                print(f"{BOLD}Options:{RESET}")
                print(f" - Type {GREEN}'approve'{RESET} to finalize the Architecture.")
                print(f" - Type {YELLOW}'intervention'{RESET} to modify graph state variables.")
                print(f" - Or type any {RED}feedback / changes{RESET} to request an Architecture revision.\n")
                
                choice = input(f"{BLUE}Enter choice: {RESET}").strip()
                
                if choice.lower() == "intervention":
                    print(f"\n{YELLOW}Transitioning to Intervention Mode...{RESET}")
                    events = app.stream(Command(resume={"__intervention__": True}), config_dict, stream_mode="values")
                else:
                    events = app.stream(Command(resume=choice), config_dict, stream_mode="values")
                    
                for event in events:
                    pass
                    
            elif interrupt_type == "database_approval":
                print_banner("HITL: Database Approval Mode Required")
                print(f"{BOLD}Generated Database Schema Model:{RESET}")
                print(f"{BLUE}{'='*40}{RESET}")
                import json
                print(json.dumps(interrupt_data.get("database_model"), indent=2))
                print(f"{BLUE}{'='*40}{RESET}\n")
                
                print(f"{BOLD}Options:{RESET}")
                print(f" - Type {GREEN}'approve'{RESET} to finalize the Database Schema.")
                print(f" - Type {YELLOW}'intervention'{RESET} to modify graph state variables.")
                print(f" - Or type any {RED}feedback / changes{RESET} to request a Database revision.\n")
                
                choice = input(f"{BLUE}Enter choice: {RESET}").strip()
                
                if choice.lower() == "intervention":
                    print(f"\n{YELLOW}Transitioning to Intervention Mode...{RESET}")
                    events = app.stream(Command(resume={"__intervention__": True}), config_dict, stream_mode="values")
                else:
                    events = app.stream(Command(resume=choice), config_dict, stream_mode="values")
                    
                for event in events:
                    pass
                    
            elif interrupt_type == "approval":
                print_banner("HITL: Approval Mode Required")
                print(f"{BOLD}Generated Requirements Document:{RESET}")
                print(f"{BLUE}{'='*40}{RESET}")
                print(interrupt_data.get("requirements"))
                print(f"{BLUE}{'='*40}{RESET}\n")
                
                print(f"{BOLD}Options:{RESET}")
                print(f" - Type {GREEN}'approve'{RESET} or {GREEN}'y'{RESET} to finalize the requirements.")
                print(f" - Type {YELLOW}'intervention'{RESET} to modify graph state variables.")
                print(f" - Or type any {RED}feedback / changes{RESET} to request a revision.\n")
                
                choice = input(f"{BLUE}Enter choice: {RESET}").strip()
                
                if choice.lower() == "intervention":
                    print(f"\n{YELLOW}Transitioning to Intervention Mode...{RESET}")
                    events = app.stream(Command(resume={"__intervention__": True}), config_dict, stream_mode="values")
                else:
                    events = app.stream(Command(resume=choice), config_dict, stream_mode="values")
                    
                for event in events:
                    pass
                    
            elif interrupt_type == "intervention":
                print_banner("HITL: Intervention Mode Active")
                print_state_summary(state_info.values)
                
                print(f"You can now inject changes into the state.")
                print("Enter your changes as a JSON dictionary (e.g. {\"prd\": \"New PRD details...\"})")
                print("Or type 'resume' to continue the workflow without changes:\n")
                
                user_in = input(f"{YELLOW}Intervention: {RESET}").strip()
                
                if user_in.lower() == "resume" or not user_in:
                    print(f"\n{GREEN}Resuming workflow...{RESET}")
                    events = app.stream(Command(resume="resume"), config_dict, stream_mode="values")
                else:
                    try:
                        changes = json.loads(user_in)
                        if not isinstance(changes, dict):
                            print(f"{RED}Invalid input. Must be a JSON object (dictionary).{RESET}")
                            continue
                        
                        print(f"\n{GREEN}Applying state changes: {list(changes.keys())} and resuming...{RESET}")
                        events = app.stream(Command(resume={"changes": changes}), config_dict, stream_mode="values")
                    except json.JSONDecodeError:
                        print(f"{RED}Invalid JSON format. Please try again.{RESET}")
                        continue
                        
                for event in events:
                    pass
            else:
                print(f"{RED}Unknown interrupt type: {interrupt_type}{RESET}")
                break
        else:
            # If no interrupts, stream to proceed
            print(f"{BLUE}Advancing graph...{RESET}")
            try:
                events = app.stream(None, config_dict, stream_mode="values")
                for event in events:
                    pass
            except Exception as e:
                print(f"{RED}Error executing graph: {e}{RESET}")
                break

if __name__ == "__main__":
    main()
