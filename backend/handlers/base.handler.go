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
		res := dto.NewErrorResponse(appErr.Code, appErr.Message)
		res.Error.Available = appErr.Available
		res.Error.SKU = appErr.SKU
		c.JSON(appErr.StatusCode, res)
		return
	}
	c.JSON(http.StatusInternalServerError, dto.NewErrorResponse("INTERNAL_SERVER_ERROR", err.Error()))
}
