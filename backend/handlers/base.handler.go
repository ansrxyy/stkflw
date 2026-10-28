package handlers

import (
	"errors"
	"net/http"

	"ansarfadillah.tech/stkflw/dto"
	"github.com/gin-gonic/gin"
)

func HandleError(c *gin.Context, err error) {
	var appErr *dto.AppError
	if errors.As(err, &appErr) {
		c.JSON(appErr.StatusCode, dto.NewErrorResponse(appErr.Code, appErr.Message))
		return
	}
	c.JSON(http.StatusInternalServerError, dto.NewErrorResponse("INTERNAL_SERVER_ERROR", err.Error()))
}
