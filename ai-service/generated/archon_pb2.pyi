from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Optional as _Optional

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
    __slots__ = ("thread_id", "status", "prd", "provider", "project_model", "architecture_model", "database_model", "openapi_model", "requirements_doc", "interrupt_type", "interrupt_payload")
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
    def __init__(self, thread_id: _Optional[str] = ..., status: _Optional[str] = ..., prd: _Optional[str] = ..., provider: _Optional[str] = ..., project_model: _Optional[str] = ..., architecture_model: _Optional[str] = ..., database_model: _Optional[str] = ..., openapi_model: _Optional[str] = ..., requirements_doc: _Optional[str] = ..., interrupt_type: _Optional[str] = ..., interrupt_payload: _Optional[str] = ...) -> None: ...
