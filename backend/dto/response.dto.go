package dto

import "net/http"

type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

type BaseResponse[T any] struct {
	Data    T               `json:"data,omitempty"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
	Message string          `json:"message,omitempty"`
}

type ErrorDetail struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type PaginatedResponse[T any] struct {
	Data  []T            `json:"data"`
	Meta  PaginationMeta `json:"meta"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
	Total int64          `json:"total"`
}

type AppError struct {
	StatusCode int    `json:"-"`
	Code       string `json:"code"`
	Message    string `json:"message"`
}

func (e *AppError) Error() string {
	return e.Message
}

func NewAppError(statusCode int, code, message string) *AppError {
	return &AppError{
		StatusCode: statusCode,
		Code:       code,
		Message:    message,
	}
}

func NewSuccessResponse[T any](data T, message ...string) BaseResponse[T] {
	msg := ""
	if len(message) > 0 {
		msg = message[0]
	}
	return BaseResponse[T]{
		Data:    data,
		Message: msg,
	}
}

func NewPaginatedResponse[T any](data []T, page, limit int, total int64) PaginatedResponse[T] {
	totalPages := 0
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}
	meta := PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
	return PaginatedResponse[T]{
		Data:  data,
		Meta:  meta,
		Page:  page,
		Limit: limit,
		Total: total,
	}
}

func NewErrorResponse(code, message string) ErrorResponse {
	return ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	}
}

func InternalError(err error) *AppError {
	return NewAppError(http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", err.Error())
}
