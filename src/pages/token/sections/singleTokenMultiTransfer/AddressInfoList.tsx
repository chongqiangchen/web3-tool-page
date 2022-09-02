import { Box, Button, Card, CardHeader, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, styled, TextField, Typography } from "@mui/material";
import Scrollbar from "src/components/Scrollbar";
import EmptyContent from "src/components/EmptyContent";
import AddressInfoTable from './BaseTokenTable';
import { useEffect, useState } from "react";
import uniqBy from "lodash/uniqBy";
import { useRecoilState, useRecoilValue } from 'recoil';
import { AddressInfoItem } from "../../types/multi";
import { useContract, useProvider, useToken } from "wagmi";
import { AbiState } from "src/atoms/common";
import { AddressInfosState, TokenAddresState } from "src/atoms/token/singleTokenMultiTransfer";
import ContentAddActions from "./ContentAddActions";
import clone from "lodash/clone";
import { ethers } from "ethers";

const FlexBox = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 2
}));

const AddressInfoList = () => {
    const [infos, setInfos] = useRecoilState(AddressInfosState);
    const tokenAddress = useRecoilValue(TokenAddresState);
    const commonAbi = useRecoilValue(AbiState);

    const provider = useProvider();
    const contract = useContract({
        addressOrName: tokenAddress,
        contractInterface: commonAbi.erc20,
        signerOrProvider: provider,
    })

    const { data: tokenInfo } = useToken({ address: tokenAddress })

    const isEmpty = infos.length === 0;

    const totalItems = 3;

    const updateInfosBalance = async (infos: AddressInfoItem[]) => {
        const newInfos: AddressInfoItem[] = [...infos];
        console.log(newInfos);

        for (let i = 0; i < infos.length; i++) {
            const item = infos[i];
            try {
                const balanceBN = await contract.balanceOf(item.address);
                newInfos[i] = {
                    ...item,
                    balanceBN: balanceBN,
                    balance: ethers.utils.formatUnits(balanceBN, tokenInfo?.decimals || 18),
                    decimals: tokenInfo?.decimals || 18
                };
            } catch (error) {
                console.warn(error);
            }
        }
        console.log('newInfos', newInfos);

        return newInfos;
    }

    const handleContentUpdate = async (infos: AddressInfoItem[]) => {
        const newInfos = await updateInfosBalance(infos);
        setInfos((old) => {
            const filterDuplicateOldItems = old.filter(item => !newInfos.find(newItem => newItem.address === item.address));
            const filterDuplicateNewItems = uniqBy(newInfos, 'address');
            return [...filterDuplicateOldItems, ...filterDuplicateNewItems];
        });
    }

    const handleAmountInputChange = (value: any, rowIndex: number) => {
        setInfos(old => {
            const newInfos = [...old];
            newInfos[rowIndex] = {
                ...newInfos[rowIndex],
                amount: value
            };
            return newInfos;
        });
    }

    const handleDelete = (address: string) => {
        const newInfos = infos.filter(info => info.address !== address);
        setInfos(newInfos);
    }

    useEffect(() => {
        (async () => {
            if (tokenAddress) {
                const newInfos = await updateInfosBalance(infos);
                console.log(newInfos);
                setInfos(newInfos);
            }
        })()
    }, [tokenAddress])

    return (
        <Card>
            <CardHeader
                title={
                    <Typography variant="h6">
                        转移地址信息表
                        <Typography component="span" sx={{ color: 'text.secondary' }}>
                            &nbsp;({totalItems} 项)
                        </Typography>
                    </Typography>
                }
                sx={{ mb: 3 }}
            />
            <ContentAddActions onUpdate={handleContentUpdate} />
            {!isEmpty ? (
                <Scrollbar sx={{ px: 2 }}>
                    <AddressInfoTable
                        onDelete={(rowIndex: number) => handleDelete(infos[rowIndex].address)}
                        infos={infos}
                        onAmountChange={handleAmountInputChange}
                        decimals={tokenInfo?.decimals}
                    />
                </Scrollbar>
            ) : (
                <EmptyContent
                    title="当前内容为空"
                    description="请下载模版并填充转移地址信息进行上传"
                    img="/assets/illustrations/illustration_empty_cart.svg"
                />
            )}
        </Card>
    )
}

export default AddressInfoList;


