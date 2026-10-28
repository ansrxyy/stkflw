package handlers

import (
	"net/http"
	"strconv"

	"ansarfadillah.tech/stkflw/dto"
	"ansarfadillah.tech/stkflw/service"
	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	productService service.IProductService
}

func NewProductHandler(productService service.IProductService) *ProductHandler {
	return &ProductHandler{
		productService: productService,
	}
}

func (h *ProductHandler) ListProducts(c *gin.Context) {
	var req dto.ListProductsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_QUERY", err.Error()))
		return
	}

	res, err := h.productService.ListProducts(req)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req dto.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_JSON", err.Error()))
		return
	}

	product, err := h.productService.CreateProduct(req)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, dto.NewSuccessResponse(product, "Product created successfully"))
}

func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_ID", "Invalid product ID"))
		return
	}

	var req dto.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_JSON", err.Error()))
		return
	}

	product, err := h.productService.UpdateProduct(id, req)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.NewSuccessResponse(product, "Product updated successfully"))
}

func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_ID", "Invalid product ID"))
		return
	}

	if err := h.productService.DeleteProduct(id); err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.NewSuccessResponse("Product deleted successfully"))
}

func (h *ProductHandler) AdjustStock(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_ID", "Invalid product ID"))
		return
	}

	var req dto.AdjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_JSON", err.Error()))
		return
	}

	product, err := h.productService.AdjustStock(id, req)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.NewSuccessResponse(product, "Stock adjusted successfully"))
}

func (h *ProductHandler) GetMovements(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_ID", "Invalid product ID"))
		return
	}

	movements, err := h.productService.GetMovements(id)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": movements})
}
