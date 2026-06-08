package aiclient

import (
	"context"
	"fmt"
	"log"
	"time"

	pb "archon/gateway/generated/archonpb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// Client wraps the gRPC connection to the Python AI service.
type Client struct {
	conn   *grpc.ClientConn
	stub   pb.ArchonAIClient
}

// StartWorkflowResult holds the response from StartWorkflow.
type StartWorkflowResult struct {
	ThreadID string
	Status   string
}

// ResumeWorkflowResult holds the response from ResumeWorkflow.
type ResumeWorkflowResult struct {
	Status string
}

// WorkflowState holds the full state snapshot from GetWorkflowState.
type WorkflowState struct {
	ThreadID          string
	Status            string
	PRD               string
	Provider          string
	ProjectModel      string
	ArchitectureModel string
	DatabaseModel     string
	OpenAPIModel      string
	BacklogModel      string
	RequirementsDoc   string
	InterruptType     string
	InterruptPayload  string
}

// NewClient establishes a gRPC connection to the AI service.
func NewClient(address string) (*Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(50*1024*1024), // 50 MB
			grpc.MaxCallSendMsgSize(50*1024*1024),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to AI service at %s: %w", address, err)
	}

	log.Printf("AI service gRPC client connected to %s", address)

	return &Client{
		conn: conn,
		stub: pb.NewArchonAIClient(conn),
	}, nil
}

// Close shuts down the gRPC connection.
func (c *Client) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// StartWorkflow sends a PRD to the AI service and starts a new design workflow.
func (c *Client) StartWorkflow(ctx context.Context, prd, provider, model string) (*StartWorkflowResult, error) {
	resp, err := c.stub.StartWorkflow(ctx, &pb.StartWorkflowRequest{
		Prd:      prd,
		Provider: provider,
		Model:    model,
	})
	if err != nil {
		return nil, fmt.Errorf("StartWorkflow RPC failed: %w", err)
	}

	return &StartWorkflowResult{
		ThreadID: resp.ThreadId,
		Status:   resp.Status,
	}, nil
}

// ResumeWorkflow resumes a paused workflow with a HITL response.
func (c *Client) ResumeWorkflow(ctx context.Context, threadID, action, payload string) (*ResumeWorkflowResult, error) {
	resp, err := c.stub.ResumeWorkflow(ctx, &pb.ResumeWorkflowRequest{
		ThreadId: threadID,
		Action:   action,
		Payload:  payload,
	})
	if err != nil {
		return nil, fmt.Errorf("ResumeWorkflow RPC failed: %w", err)
	}

	return &ResumeWorkflowResult{
		Status: resp.Status,
	}, nil
}

// GetWorkflowState retrieves the full current state of a workflow.
func (c *Client) GetWorkflowState(ctx context.Context, threadID string) (*WorkflowState, error) {
	resp, err := c.stub.GetWorkflowState(ctx, &pb.GetWorkflowStateRequest{
		ThreadId: threadID,
	})
	if err != nil {
		return nil, fmt.Errorf("GetWorkflowState RPC failed: %w", err)
	}

	return &WorkflowState{
		ThreadID:          resp.ThreadId,
		Status:            resp.Status,
		PRD:               resp.Prd,
		Provider:          resp.Provider,
		ProjectModel:      resp.ProjectModel,
		ArchitectureModel: resp.ArchitectureModel,
		DatabaseModel:     resp.DatabaseModel,
		OpenAPIModel:      resp.OpenapiModel,
		BacklogModel:      resp.BacklogModel,
		RequirementsDoc:   resp.RequirementsDoc,
		InterruptType:     resp.InterruptType,
		InterruptPayload:  resp.InterruptPayload,
	}, nil
}

// ExportedFile represents one artifact file in an export bundle.
type ExportedFile struct {
	Filename  string
	Content   string
	SizeBytes int64
}

// ExportArtifactsResult holds the full export bundle from the AI service.
type ExportArtifactsResult struct {
	Files               []ExportedFile
	ZipBytes            []byte
	TotalSizeBytes      int64
	HadProjectModel     bool
	HadArchitectureModel bool
	HadDatabaseModel    bool
	HadOpenAPIModel     bool
}

// ExportArtifacts calls the AI service to generate all design artifacts and
// returns them as a bundle including a ZIP archive.
func (c *Client) ExportArtifacts(
	ctx context.Context,
	projectModelJSON,
	architectureModelJSON,
	databaseModelJSON,
	openapiModelJSON string,
) (*ExportArtifactsResult, error) {
	resp, err := c.stub.ExportArtifacts(ctx, &pb.ExportArtifactsRequest{
		ProjectModelJson:      projectModelJSON,
		ArchitectureModelJson: architectureModelJSON,
		DatabaseModelJson:     databaseModelJSON,
		OpenapiModelJson:      openapiModelJSON,
	})
	if err != nil {
		return nil, fmt.Errorf("ExportArtifacts RPC failed: %w", err)
	}

	files := make([]ExportedFile, 0, len(resp.Files))
	for _, f := range resp.Files {
		files = append(files, ExportedFile{
			Filename:  f.Filename,
			Content:   f.Content,
			SizeBytes: f.SizeBytes,
		})
	}

	return &ExportArtifactsResult{
		Files:                files,
		ZipBytes:             resp.ZipBytes,
		TotalSizeBytes:       resp.TotalSizeBytes,
		HadProjectModel:      resp.HadProjectModel,
		HadArchitectureModel: resp.HadArchitectureModel,
		HadDatabaseModel:     resp.HadDatabaseModel,
		HadOpenAPIModel:      resp.HadOpenapiModel,
	}, nil
}

// GenerateBacklogResult holds the response from GenerateBacklog.
type GenerateBacklogResult struct {
	BacklogModel string
}

// GenerateBacklog calls the AI service to generate an implementation backlog.
func (c *Client) GenerateBacklog(ctx context.Context, threadID, feedback string) (*GenerateBacklogResult, error) {
	resp, err := c.stub.GenerateBacklog(ctx, &pb.GenerateBacklogRequest{
		ThreadId: threadID,
		Feedback: feedback,
	})
	if err != nil {
		return nil, fmt.Errorf("GenerateBacklog RPC failed: %w", err)
	}

	return &GenerateBacklogResult{
		BacklogModel: resp.BacklogModel,
	}, nil
}
