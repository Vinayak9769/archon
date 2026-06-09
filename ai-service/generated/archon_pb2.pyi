from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class StartWorkflowRequest(_message.Message):
    __slots__ = ("prd", "provider", "model")
    PRD_FIELD_NUMBER: _ClassVar[int]
    PROVIDER_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    prd: str
    provider: str
    model: str
    def __init__(self, prd: _Optional[str] = ..., provider: _Optional[str] = ..., model: _Optional[str] = ...) -> None: ...

class StartWorkflowResponse(_message.Message):
    __slots__ = ("thread_id", "status")
    THREAD_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    thread_id: str
    status: str
    def __init__(self, thread_id: _Optional[str] = ..., status: _Optional[str] = ...) -> None: ...

class ResumeWorkflowRequest(_message.Message):
    __slots__ = ("thread_id", "action", "payload")
    THREAD_ID_FIELD_NUMBER: _ClassVar[int]
    ACTION_FIELD_NUMBER: _ClassVar[int]
    PAYLOAD_FIELD_NUMBER: _ClassVar[int]
    thread_id: str
    action: str
    payload: str
    def __init__(self, thread_id: _Optional[str] = ..., action: _Optional[str] = ..., payload: _Optional[str] = ...) -> None: ...

class ResumeWorkflowResponse(_message.Message):
    __slots__ = ("status",)
    STATUS_FIELD_NUMBER: _ClassVar[int]
    status: str
    def __init__(self, status: _Optional[str] = ...) -> None: ...

class GetWorkflowStateRequest(_message.Message):
    __slots__ = ("thread_id",)
    THREAD_ID_FIELD_NUMBER: _ClassVar[int]
    thread_id: str
    def __init__(self, thread_id: _Optional[str] = ...) -> None: ...

class GetWorkflowStateResponse(_message.Message):
    __slots__ = ("thread_id", "status", "prd", "provider", "project_model", "architecture_model", "database_model", "openapi_model", "requirements_doc", "interrupt_type", "interrupt_payload", "backlog_model")
    THREAD_ID_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    PRD_FIELD_NUMBER: _ClassVar[int]
    PROVIDER_FIELD_NUMBER: _ClassVar[int]
    PROJECT_MODEL_FIELD_NUMBER: _ClassVar[int]
    ARCHITECTURE_MODEL_FIELD_NUMBER: _ClassVar[int]
    DATABASE_MODEL_FIELD_NUMBER: _ClassVar[int]
    OPENAPI_MODEL_FIELD_NUMBER: _ClassVar[int]
    REQUIREMENTS_DOC_FIELD_NUMBER: _ClassVar[int]
    INTERRUPT_TYPE_FIELD_NUMBER: _ClassVar[int]
    INTERRUPT_PAYLOAD_FIELD_NUMBER: _ClassVar[int]
    BACKLOG_MODEL_FIELD_NUMBER: _ClassVar[int]
    thread_id: str
    status: str
    prd: str
    provider: str
    project_model: str
    architecture_model: str
    database_model: str
    openapi_model: str
    requirements_doc: str
    interrupt_type: str
    interrupt_payload: str
    backlog_model: str
    def __init__(self, thread_id: _Optional[str] = ..., status: _Optional[str] = ..., prd: _Optional[str] = ..., provider: _Optional[str] = ..., project_model: _Optional[str] = ..., architecture_model: _Optional[str] = ..., database_model: _Optional[str] = ..., openapi_model: _Optional[str] = ..., requirements_doc: _Optional[str] = ..., interrupt_type: _Optional[str] = ..., interrupt_payload: _Optional[str] = ..., backlog_model: _Optional[str] = ...) -> None: ...

class ExportArtifactsRequest(_message.Message):
    __slots__ = ("project_model_json", "architecture_model_json", "database_model_json", "openapi_model_json")
    PROJECT_MODEL_JSON_FIELD_NUMBER: _ClassVar[int]
    ARCHITECTURE_MODEL_JSON_FIELD_NUMBER: _ClassVar[int]
    DATABASE_MODEL_JSON_FIELD_NUMBER: _ClassVar[int]
    OPENAPI_MODEL_JSON_FIELD_NUMBER: _ClassVar[int]
    project_model_json: str
    architecture_model_json: str
    database_model_json: str
    openapi_model_json: str
    def __init__(self, project_model_json: _Optional[str] = ..., architecture_model_json: _Optional[str] = ..., database_model_json: _Optional[str] = ..., openapi_model_json: _Optional[str] = ...) -> None: ...

class ExportedFile(_message.Message):
    __slots__ = ("filename", "content", "size_bytes")
    FILENAME_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    filename: str
    content: str
    size_bytes: int
    def __init__(self, filename: _Optional[str] = ..., content: _Optional[str] = ..., size_bytes: _Optional[int] = ...) -> None: ...

class ExportArtifactsResponse(_message.Message):
    __slots__ = ("files", "zip_bytes", "total_size_bytes", "had_project_model", "had_architecture_model", "had_database_model", "had_openapi_model")
    FILES_FIELD_NUMBER: _ClassVar[int]
    ZIP_BYTES_FIELD_NUMBER: _ClassVar[int]
    TOTAL_SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    HAD_PROJECT_MODEL_FIELD_NUMBER: _ClassVar[int]
    HAD_ARCHITECTURE_MODEL_FIELD_NUMBER: _ClassVar[int]
    HAD_DATABASE_MODEL_FIELD_NUMBER: _ClassVar[int]
    HAD_OPENAPI_MODEL_FIELD_NUMBER: _ClassVar[int]
    files: _containers.RepeatedCompositeFieldContainer[ExportedFile]
    zip_bytes: bytes
    total_size_bytes: int
    had_project_model: bool
    had_architecture_model: bool
    had_database_model: bool
    had_openapi_model: bool
    def __init__(self, files: _Optional[_Iterable[_Union[ExportedFile, _Mapping]]] = ..., zip_bytes: _Optional[bytes] = ..., total_size_bytes: _Optional[int] = ..., had_project_model: _Optional[bool] = ..., had_architecture_model: _Optional[bool] = ..., had_database_model: _Optional[bool] = ..., had_openapi_model: _Optional[bool] = ...) -> None: ...

class GenerateBacklogRequest(_message.Message):
    __slots__ = ("thread_id", "feedback")
    THREAD_ID_FIELD_NUMBER: _ClassVar[int]
    FEEDBACK_FIELD_NUMBER: _ClassVar[int]
    thread_id: str
    feedback: str
    def __init__(self, thread_id: _Optional[str] = ..., feedback: _Optional[str] = ...) -> None: ...

class GenerateBacklogResponse(_message.Message):
    __slots__ = ("backlog_model",)
    BACKLOG_MODEL_FIELD_NUMBER: _ClassVar[int]
    backlog_model: str
    def __init__(self, backlog_model: _Optional[str] = ...) -> None: ...

class TaskMessageProto(_message.Message):
    __slots__ = ("role", "content", "sender")
    ROLE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    SENDER_FIELD_NUMBER: _ClassVar[int]
    role: str
    content: str
    sender: str
    def __init__(self, role: _Optional[str] = ..., content: _Optional[str] = ..., sender: _Optional[str] = ...) -> None: ...

class GenerateIssueDraftRequest(_message.Message):
    __slots__ = ("task_title", "epic_name", "story_name", "project_name", "workspace", "description", "messages")
    TASK_TITLE_FIELD_NUMBER: _ClassVar[int]
    EPIC_NAME_FIELD_NUMBER: _ClassVar[int]
    STORY_NAME_FIELD_NUMBER: _ClassVar[int]
    PROJECT_NAME_FIELD_NUMBER: _ClassVar[int]
    WORKSPACE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    task_title: str
    epic_name: str
    story_name: str
    project_name: str
    workspace: str
    description: str
    messages: _containers.RepeatedCompositeFieldContainer[TaskMessageProto]
    def __init__(self, task_title: _Optional[str] = ..., epic_name: _Optional[str] = ..., story_name: _Optional[str] = ..., project_name: _Optional[str] = ..., workspace: _Optional[str] = ..., description: _Optional[str] = ..., messages: _Optional[_Iterable[_Union[TaskMessageProto, _Mapping]]] = ...) -> None: ...

class GenerateIssueDraftResponse(_message.Message):
    __slots__ = ("questions",)
    QUESTIONS_FIELD_NUMBER: _ClassVar[int]
    questions: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, questions: _Optional[_Iterable[str]] = ...) -> None: ...

class AnswerProto(_message.Message):
    __slots__ = ("question", "answer")
    QUESTION_FIELD_NUMBER: _ClassVar[int]
    ANSWER_FIELD_NUMBER: _ClassVar[int]
    question: str
    answer: str
    def __init__(self, question: _Optional[str] = ..., answer: _Optional[str] = ...) -> None: ...

class FinalizeIssueRequest(_message.Message):
    __slots__ = ("task_title", "epic_name", "story_name", "project_name", "workspace", "description", "messages", "answers")
    TASK_TITLE_FIELD_NUMBER: _ClassVar[int]
    EPIC_NAME_FIELD_NUMBER: _ClassVar[int]
    STORY_NAME_FIELD_NUMBER: _ClassVar[int]
    PROJECT_NAME_FIELD_NUMBER: _ClassVar[int]
    WORKSPACE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    ANSWERS_FIELD_NUMBER: _ClassVar[int]
    task_title: str
    epic_name: str
    story_name: str
    project_name: str
    workspace: str
    description: str
    messages: _containers.RepeatedCompositeFieldContainer[TaskMessageProto]
    answers: _containers.RepeatedCompositeFieldContainer[AnswerProto]
    def __init__(self, task_title: _Optional[str] = ..., epic_name: _Optional[str] = ..., story_name: _Optional[str] = ..., project_name: _Optional[str] = ..., workspace: _Optional[str] = ..., description: _Optional[str] = ..., messages: _Optional[_Iterable[_Union[TaskMessageProto, _Mapping]]] = ..., answers: _Optional[_Iterable[_Union[AnswerProto, _Mapping]]] = ...) -> None: ...

class FinalizeIssueResponse(_message.Message):
    __slots__ = ("title", "body")
    TITLE_FIELD_NUMBER: _ClassVar[int]
    BODY_FIELD_NUMBER: _ClassVar[int]
    title: str
    body: str
    def __init__(self, title: _Optional[str] = ..., body: _Optional[str] = ...) -> None: ...
